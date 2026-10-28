const crypto = require('node:crypto');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const User = require('../models/User');
const ClinicPatient = require('../models/ClinicPatient');
const ClinicAppointment = require('../models/ClinicAppointment');
const ClinicVisit = require('../models/ClinicVisit');
const ClinicSale = require('../models/ClinicSale');
const ClinicBill = require('../models/ClinicBill');
const PharmacyMedicine = require('../models/PharmacyMedicine');
const ClinicAuditLog = require('../models/ClinicAuditLog');

const staffRoles = ['admin', 'doctor', 'receptionist', 'pharmacist'];
const dateStart = (value) => { const date = new Date(value); if (!Number.isFinite(date.getTime())) return null; date.setHours(0, 0, 0, 0); return date; };
const dateEnd = (value) => { const date = new Date(value); if (!Number.isFinite(date.getTime())) return null; date.setHours(23, 59, 59, 999); return date; };
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const validId = (value) => mongoose.isValidObjectId(value);
const audit = async (actor, action, entityType, entityId, summary, metadata = {}) => {
  try { await ClinicAuditLog.create({ actor, action, entityType, entityId, summary, metadata }); }
  catch (error) { console.error('Clinic audit write failed:', error.message); }
};
const idError = (res) => res.status(400).json({ success: false, message: 'Invalid record ID.' });
const emptyPeriod = () => ({ revenue: 0, transactions: 0, items: 0, pending: 0, discounts: 0, refunds: 0 });
async function periodStats(from) {
  const match = { status: { $nin: ['void', 'refunded'] } };
  if (from) match.createdAt = { $gte: from };
  const pipeline = [
    { $match: match },
    { $group: { _id: null, revenue: { $sum: { $subtract: ['$total', '$refundedAmount'] } }, transactions: { $sum: 1 }, items: { $sum: { $sum: '$items.quantity' } }, pending: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, '$total', 0] } }, discounts: { $sum: '$discount' }, refunds: { $sum: '$refundedAmount' } } },
  ];
  const [pharmacy, clinic] = await Promise.all([ClinicSale.aggregate(pipeline), ClinicBill.aggregate(pipeline)]);
  return Object.keys(emptyPeriod()).reduce((total, key) => { total[key] = (pharmacy[0]?.[key] || 0) + (clinic[0]?.[key] || 0); return total; }, emptyPeriod());
}

async function getOverview(req, res) {
  try {
    const now = new Date();
    const today = new Date(now); today.setHours(0, 0, 0, 0);
    const week = new Date(today); week.setDate(week.getDate() - 6);
    const month = new Date(now.getFullYear(), now.getMonth(), 1);
    const [patients, staff, medicines, todayStats, weekStats, monthStats, allStats, pharmacyRecent, clinicRecent, lowStock, expiring, appointmentsToday, recentActivity] = await Promise.all([
      ClinicPatient.countDocuments({ active: true }),
      User.countDocuments({ role: { $in: staffRoles }, active: { $ne: false } }),
      PharmacyMedicine.countDocuments({ active: true }),
      periodStats(today), periodStats(week), periodStats(month), periodStats(null),
      ClinicSale.find().sort({ createdAt: -1 }).limit(6).populate('patient', 'patientId name').populate('staff', 'name').lean(),
      ClinicBill.find().sort({ createdAt: -1 }).limit(6).populate('patient', 'patientId name').populate('staff', 'name').lean(),
      PharmacyMedicine.countDocuments({ active: true, $expr: { $lte: ['$stock', '$reorderLevel'] } }),
      PharmacyMedicine.countDocuments({ active: true, batches: { $elemMatch: { quantity: { $gt: 0 }, expiresAt: { $gte: today, $lte: new Date(today.getTime() + 90 * 86400000) } } } }),
      ClinicAppointment.countDocuments({ scheduledAt: { $gte: today, $lt: new Date(today.getTime() + 86400000) }, status: { $nin: ['cancelled', 'no_show'] } }),
      ClinicAuditLog.find().sort({ createdAt: -1 }).limit(8).populate('actor', 'name role').lean(),
    ]);
    const dailyPipeline = [{ $match: { createdAt: { $gte: week }, status: { $nin: ['void', 'refunded'] } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: { $subtract: ['$total', '$refundedAmount'] } }, transactions: { $sum: 1 } } }, { $sort: { _id: 1 } }];
    const [pharmacyDaily, clinicDaily] = await Promise.all([ClinicSale.aggregate(dailyPipeline), ClinicBill.aggregate(dailyPipeline)]);
    const lookup = new Map();
    for (const day of [...pharmacyDaily, ...clinicDaily]) { const current = lookup.get(day._id) || { revenue: 0, transactions: 0 }; current.revenue += day.revenue; current.transactions += day.transactions; lookup.set(day._id, current); }
    const trend = Array.from({ length: 7 }, (_, index) => { const day = new Date(week); day.setDate(week.getDate() + index); const key = day.toISOString().slice(0, 10); return { date: key, revenue: lookup.get(key)?.revenue || 0, transactions: lookup.get(key)?.transactions || 0 }; });
    const recentSales = [...pharmacyRecent.map((sale) => ({ ...sale, source: 'pharmacy' })), ...clinicRecent.map((bill) => ({ ...bill, source: 'clinic' }))].sort((a, b) => b.createdAt - a.createdAt).slice(0, 8);
    return res.json({ success: true, updatedAt: now.toISOString(), patients, staff, medicines, lowStock, expiringWithin90Days: expiring, appointmentsToday, periods: { today: todayStats, week: weekStats, month: monthStats, all: allStats }, trend, recentSales, recentActivity });
  } catch (error) {
    console.error('Clinic dashboard error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load clinic dashboard.' });
  }
}

async function listMedicines(req, res) {
  try {
    const filter = {};
    if (req.query.active !== 'all') filter.active = req.query.active === 'false' ? false : true;
    if (req.query.search) { const pattern = new RegExp(escapeRegex(req.query.search.trim()), 'i'); filter.$or = [{ name: pattern }, { genericName: pattern }, { category: pattern }, { 'batches.batchNumber': pattern }]; }
    if (req.query.stock === 'low') filter.$expr = { $lte: ['$stock', '$reorderLevel'] };
    if (req.query.stock === 'out') filter.stock = 0;
    const medicines = await PharmacyMedicine.find(filter).sort({ name: 1 }).lean();
    const now = new Date();
    const result = medicines.map((item) => {
      const batches = (item.batches || []).map((batch) => ({ ...batch, expired: new Date(batch.expiresAt) < now, expiresWithin90Days: new Date(batch.expiresAt) >= now && new Date(batch.expiresAt) <= new Date(now.getTime() + 90 * 86400000) }));
      return { ...item, batches, lowStock: item.stock <= item.reorderLevel, expiredQuantity: batches.filter((batch) => batch.expired).reduce((sum, batch) => sum + batch.quantity, 0), expiringQuantity: batches.filter((batch) => batch.expiresWithin90Days).reduce((sum, batch) => sum + batch.quantity, 0) };
    });
    return res.json({ success: true, medicines: result });
  } catch (error) {
    console.error('List pharmacy medicines error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load pharmacy inventory.' });
  }
}

async function createMedicine(req, res) {
  const body = req.body || {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const category = typeof body.category === 'string' ? body.category.trim() : '';
  const price = Number(body.sellingPrice);
  if (!name || !category || !Number.isFinite(price) || price < 0) return res.status(400).json({ success: false, message: 'Medicine name, category, and a valid selling price are required.' });
  if (body.imageUrl && !/^https:\/\//i.test(body.imageUrl)) return res.status(400).json({ success: false, message: 'Medicine image URL must use HTTPS.' });
  const initialBatch = body.batch || null;
  const batches = [];
  if (initialBatch) {
    const quantity = Number(initialBatch.quantity);
    const expiry = new Date(initialBatch.expiresAt);
    if (!initialBatch.batchNumber?.trim() || !Number.isInteger(quantity) || quantity < 0 || !Number.isFinite(expiry.getTime()) || expiry <= new Date()) return res.status(400).json({ success: false, message: 'Enter a batch number, non-negative quantity, and future expiry date.' });
    batches.push({ batchNumber: initialBatch.batchNumber.trim(), expiresAt: expiry, quantity, purchasePrice: Math.max(0, Number(initialBatch.purchasePrice) || 0) });
  }
  try {
    const medicine = await PharmacyMedicine.create({ name, genericName: body.genericName || '', strength: body.strength || '', dosageForm: body.dosageForm || '', category, description: body.description || '', imageUrl: body.imageUrl || '', sellingPrice: price, purchasePrice: Math.max(0, Number(body.purchasePrice) || 0), stock: batches.reduce((sum, batch) => sum + batch.quantity, 0), reorderLevel: Math.max(0, Math.floor(Number(body.reorderLevel) || 0)), batches, createdBy: req.user.id });
    await audit(req.user.id, 'medicine.created', 'medicine', medicine._id, `Added medicine ${medicine.name}`);
    return res.status(201).json({ success: true, medicine });
  } catch (error) {
    console.error('Create medicine error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to save medicine.' });
  }
}

async function updateMedicine(req, res) {
  if (!validId(req.params.id)) return idError(res);
  const fields = ['name', 'genericName', 'strength', 'dosageForm', 'category', 'description', 'imageUrl', 'sellingPrice', 'purchasePrice', 'reorderLevel', 'active'];
  const updates = {};
  for (const field of fields) if (req.body?.[field] !== undefined) updates[field] = req.body[field];
  if (updates.sellingPrice !== undefined && (!Number.isFinite(Number(updates.sellingPrice)) || Number(updates.sellingPrice) < 0)) return res.status(400).json({ success: false, message: 'Selling price must be non-negative.' });
  if (updates.reorderLevel !== undefined && (!Number.isInteger(Number(updates.reorderLevel)) || Number(updates.reorderLevel) < 0)) return res.status(400).json({ success: false, message: 'Reorder level must be a non-negative whole number.' });
  if (updates.imageUrl && !/^https:\/\//i.test(updates.imageUrl)) return res.status(400).json({ success: false, message: 'Medicine image URL must use HTTPS.' });
  try {
    const medicine = await PharmacyMedicine.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!medicine) return res.status(404).json({ success: false, message: 'Medicine not found.' });
    await audit(req.user.id, 'medicine.updated', 'medicine', medicine._id, `Updated medicine ${medicine.name}`);
    return res.json({ success: true, medicine });
  } catch (error) {
    console.error('Update medicine error:', error.message);
    return res.status(400).json({ success: false, message: 'Medicine changes are invalid.' });
  }
}

async function adjustStock(req, res) {
  if (!validId(req.params.id)) return idError(res);
  const { batchNumber, expiresAt, quantity, purchasePrice, reason } = req.body || {};
  const amount = Number(quantity);
  if (!Number.isInteger(amount) || amount === 0 || Math.abs(amount) > 100000 || !String(reason || '').trim()) return res.status(400).json({ success: false, message: 'Enter a non-zero whole quantity and adjustment reason.' });
  try {
    const medicine = await PharmacyMedicine.findById(req.params.id);
    if (!medicine) return res.status(404).json({ success: false, message: 'Medicine not found.' });
    let batch;
    if (amount > 0) {
      const expiry = new Date(expiresAt);
      if (!String(batchNumber || '').trim() || !Number.isFinite(expiry.getTime()) || expiry <= new Date()) return res.status(400).json({ success: false, message: 'Stock additions need a batch number and future expiry date.' });
      batch = medicine.batches.find((item) => item.batchNumber === String(batchNumber).trim() && item.expiresAt.getTime() === expiry.getTime());
      if (batch) batch.quantity += amount;
      else medicine.batches.push({ batchNumber: String(batchNumber).trim(), expiresAt: expiry, quantity: amount, purchasePrice: Math.max(0, Number(purchasePrice) || 0) });
      medicine.stock += amount;
    } else {
      const batchId = req.body.batchId;
      batch = batchId ? medicine.batches.id(batchId) : null;
      if (!batch) return res.status(400).json({ success: false, message: 'Choose the batch to remove stock from.' });
      if (batch.quantity < Math.abs(amount)) return res.status(409).json({ success: false, message: 'The selected batch does not have enough stock.' });
      batch.quantity += amount; medicine.stock += amount;
    }
    await medicine.save();
    await audit(req.user.id, 'stock.adjusted', 'medicine', medicine._id, `${amount > 0 ? 'Added' : 'Removed'} ${Math.abs(amount)} units of ${medicine.name}`, { batchNumber: batch.batchNumber, reason: String(reason).trim() });
    return res.json({ success: true, medicine });
  } catch (error) {
    console.error('Adjust pharmacy stock error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to adjust stock.' });
  }
}

async function listPatients(req, res) {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const filter = { active: true };
    if (req.query.search) { const pattern = new RegExp(escapeRegex(req.query.search.trim()), 'i'); filter.$or = [{ name: pattern }, { phone: pattern }, { email: pattern }, { patientId: pattern }]; }
    const [patients, total] = await Promise.all([ClinicPatient.find(filter).select('patientId name phone email dateOfBirth gender address createdAt').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), ClinicPatient.countDocuments(filter)]);
    return res.json({ success: true, patients, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('List clinic patients error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load patient records.' });
  }
}

async function getPatient(req, res) {
  if (!validId(req.params.id)) return idError(res);
  try {
    let query = ClinicPatient.findOne({ _id: req.params.id, active: true });
    if (!['admin', 'doctor'].includes(req.user.role)) query = query.select('-allergies -medicalNotes');
    const patient = await query.lean();
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found.' });
    return res.json({ success: true, patient });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to load patient details.' });
  }
}

async function createPatient(req, res) {
  const { name, phone, email, dateOfBirth, gender, address } = req.body || {};
  if (typeof name !== 'string' || !name.trim() || typeof phone !== 'string' || !phone.trim()) return res.status(400).json({ success: false, message: 'Patient name and phone are required.' });
  try {
    const patient = await ClinicPatient.create({ patientId: `PT-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`, name: name.trim(), phone: phone.trim(), email: String(email || '').trim().toLowerCase(), dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined, gender: gender || 'prefer_not_to_say', address: address || '', createdBy: req.user.id });
    await audit(req.user.id, 'patient.created', 'patient', patient._id, `Registered patient ${patient.patientId}`);
    return res.status(201).json({ success: true, patient: patient.toObject() });
  } catch (error) {
    console.error('Create patient error:', error.message);
    return res.status(400).json({ success: false, message: 'Unable to register patient. Check the details and try again.' });
  }
}

async function updatePatient(req, res) {
  if (!validId(req.params.id)) return idError(res);
  const allowed = req.user.role === 'admin' || req.user.role === 'doctor' ? ['name', 'phone', 'email', 'dateOfBirth', 'gender', 'address', 'allergies', 'medicalNotes'] : ['name', 'phone', 'email', 'dateOfBirth', 'gender', 'address'];
  const updates = Object.fromEntries(allowed.filter((key) => req.body?.[key] !== undefined).map((key) => [key, req.body[key]]));
  try {
    const patient = await ClinicPatient.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).select('-allergies -medicalNotes');
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found.' });
    await audit(req.user.id, 'patient.updated', 'patient', patient._id, `Updated patient ${patient.patientId}`);
    return res.json({ success: true, patient });
  } catch (error) {
    return res.status(400).json({ success: false, message: 'Patient changes are invalid.' });
  }
}

async function listAppointments(req, res) {
  try {
    const from = req.query.from ? dateStart(req.query.from) : new Date(new Date().setHours(0, 0, 0, 0));
    const to = req.query.to ? dateEnd(req.query.to) : new Date(new Date(from).setDate(from.getDate() + 30));
    if (!from || !to) return res.status(400).json({ success: false, message: 'Choose valid appointment dates.' });
    const filter = { scheduledAt: { $gte: from, $lte: to } };
    if (req.user.role === 'doctor') filter.doctor = req.user.id;
    if (req.query.status) filter.status = req.query.status;
    const appointments = await ClinicAppointment.find(filter).populate('patient', 'patientId name phone').populate('doctor', 'name').sort({ scheduledAt: 1, tokenNumber: 1 }).limit(500).lean();
    return res.json({ success: true, appointments });
  } catch (error) {
    console.error('List clinic appointments error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load appointments.' });
  }
}

async function createAppointment(req, res) {
  const { patientId, doctorId, scheduledAt, reason } = req.body || {};
  if (!validId(patientId) || !validId(doctorId) || !Number.isFinite(new Date(scheduledAt).getTime())) return res.status(400).json({ success: false, message: 'Select a patient, doctor, and valid appointment time.' });
  try {
    const [patient, doctor] = await Promise.all([ClinicPatient.findOne({ _id: patientId, active: true }).select('_id patientId'), User.findOne({ _id: doctorId, role: 'doctor', active: { $ne: false } }).select('_id')]);
    if (!patient) return res.status(404).json({ success: false, message: 'Active patient not found.' });
    if (!doctor) return res.status(404).json({ success: false, message: 'Active doctor account not found.' });
    const time = new Date(scheduledAt);
    const start = new Date(time); start.setHours(0, 0, 0, 0);
    const tokenNumber = await ClinicAppointment.countDocuments({ scheduledAt: { $gte: start, $lt: new Date(start.getTime() + 86400000) }, status: { $nin: ['cancelled', 'no_show'] } }) + 1;
    const appointment = await ClinicAppointment.create({ patient: patient._id, doctor: doctor._id, scheduledAt: time, reason: String(reason || '').trim(), tokenNumber, createdBy: req.user.id });
    await audit(req.user.id, 'appointment.created', 'appointment', appointment._id, `Scheduled appointment ${patient.patientId}`);
    return res.status(201).json({ success: true, appointment });
  } catch (error) {
    console.error('Create clinic appointment error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to schedule appointment.' });
  }
}

async function updateAppointment(req, res) {
  if (!validId(req.params.id)) return idError(res);
  const statuses = ['scheduled', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show'];
  if (!statuses.includes(req.body?.status)) return res.status(400).json({ success: false, message: 'Choose a valid appointment status.' });
  try {
    const filter = { _id: req.params.id };
    if (req.user.role === 'doctor') filter.doctor = req.user.id;
    const appointment = await ClinicAppointment.findOneAndUpdate(filter, { status: req.body.status }, { new: true }).populate('patient', 'patientId name').populate('doctor', 'name');
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found or not assigned to you.' });
    await audit(req.user.id, 'appointment.status_changed', 'appointment', appointment._id, `Changed appointment status to ${appointment.status}`);
    return res.json({ success: true, appointment });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to update appointment.' });
  }
}

async function listVisits(req, res) {
  try {
    const filter = {};
    if (req.user.role === 'doctor') filter.doctor = req.user.id;
    if (req.query.patientId && validId(req.query.patientId)) filter.patient = req.query.patientId;
    const visits = await ClinicVisit.find(filter).populate('patient', 'patientId name').populate('doctor', 'name').populate('prescriptions.medicine', 'name strength dosageForm').sort({ createdAt: -1 }).limit(200).lean();
    return res.json({ success: true, visits });
  } catch (error) {
    console.error('List clinic visits error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load visit records.' });
  }
}

async function createVisit(req, res) {
  const { patientId, appointmentId, diagnosis, notes, prescriptions, followUpAt } = req.body || {};
  if (!validId(patientId) || typeof diagnosis !== 'string' || !diagnosis.trim() || !Array.isArray(prescriptions || [])) return res.status(400).json({ success: false, message: 'A patient and diagnosis are required.' });
  try {
    const patient = await ClinicPatient.findOne({ _id: patientId, active: true }).select('_id patientId');
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found.' });
    const visit = await ClinicVisit.create({ patient: patient._id, appointment: validId(appointmentId) ? appointmentId : undefined, doctor: req.user.id, diagnosis: diagnosis.trim(), notes: String(notes || '').trim(), prescriptions: prescriptions.slice(0, 30), followUpAt: followUpAt ? new Date(followUpAt) : undefined });
    if (visit.appointment) await ClinicAppointment.updateOne({ _id: visit.appointment, doctor: req.user.id }, { status: 'completed' });
    await audit(req.user.id, 'visit.created', 'visit', visit._id, `Recorded clinic visit ${patient.patientId}`);
    return res.status(201).json({ success: true, visit });
  } catch (error) {
    console.error('Create clinic visit error:', error.message);
    return res.status(400).json({ success: false, message: 'Unable to save visit. Check prescription details.' });
  }
}

async function createSale(req, res) {
  const { items, patientId, paymentMethod, paymentStatus = 'paid', discount = 0, tax = 0 } = req.body || {};
  const methods = ['cash', 'card', 'bank_transfer', 'mobile_wallet', 'other'];
  if (!Array.isArray(items) || !items.length || items.length > 50 || !methods.includes(paymentMethod) || !['paid', 'pending'].includes(paymentStatus)) return res.status(400).json({ success: false, message: 'Add sale items and select a valid payment method and status.' });
  const requested = new Map();
  for (const item of items) {
    if (!validId(item.medicineId) || !Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1) return res.status(400).json({ success: false, message: 'A sale item or quantity is invalid.' });
    const id = String(item.medicineId); requested.set(id, (requested.get(id) || 0) + Number(item.quantity));
  }
  const discountAmount = Number(discount); const taxAmount = Number(tax);
  if (!Number.isFinite(discountAmount) || discountAmount < 0 || !Number.isFinite(taxAmount) || taxAmount < 0) return res.status(400).json({ success: false, message: 'Discount and tax must be non-negative amounts.' });
  let patient;
  if (patientId) { if (!validId(patientId)) return res.status(400).json({ success: false, message: 'Patient ID is invalid.' }); patient = await ClinicPatient.findOne({ _id: patientId, active: true }).select('_id name patientId'); if (!patient) return res.status(404).json({ success: false, message: 'Patient not found.' }); }
  const reservations = [];
  const idempotencyKey = String(req.get('Idempotency-Key') || '').trim();
  if (idempotencyKey && !/^[a-zA-Z0-9_-]{16,100}$/.test(idempotencyKey)) return res.status(400).json({ success: false, message: 'Sale request key is invalid.' });
  if (idempotencyKey) {
    const existing = await ClinicSale.findOne({ idempotencyKey }).select('+idempotencyKey').lean();
    if (existing) return res.status(200).json({ success: true, sale: existing, duplicate: true });
  }
  try {
    const lines = [];
    for (const [medicineId, quantity] of requested) {
      const medicine = await PharmacyMedicine.findOneAndUpdate({ _id: medicineId, active: true, stock: { $gte: quantity } }, { $inc: { stock: -quantity } }, { new: true });
      if (!medicine) {
        const exists = await PharmacyMedicine.findById(medicineId).select('name stock active').lean();
        throw Object.assign(new Error(!exists ? 'A medicine in the sale no longer exists.' : !exists.active ? `${exists.name} is inactive.` : `Only ${exists.stock} units of ${exists.name} remain.`), { status: 409 });
      }
      const reservation = { medicineId, quantity, allocations: [] }; reservations.push(reservation);
      let remaining = quantity;
      const eligibleBatches = medicine.batches.filter((batch) => batch.quantity > 0 && batch.expiresAt > new Date()).sort((a, b) => a.expiresAt - b.expiresAt);
      for (const batch of eligibleBatches) {
        if (!remaining) break;
        const amount = Math.min(remaining, batch.quantity);
        const updated = await PharmacyMedicine.updateOne({ _id: medicineId, batches: { $elemMatch: { _id: batch._id, quantity: { $gte: amount }, expiresAt: { $gt: new Date() } } } }, { $inc: { 'batches.$.quantity': -amount } });
        if (!updated.modifiedCount) continue;
        reservation.allocations.push({ batchId: batch._id, quantity: amount }); remaining -= amount;
      }
      if (remaining) throw Object.assign(new Error(`${medicine.name} does not have enough unexpired batch stock.`), { status: 409 });
      lines.push({ medicine: medicine._id, name: medicine.name, quantity, unitPrice: medicine.sellingPrice, lineTotal: medicine.sellingPrice * quantity, batchAllocations: reservation.allocations });
    }
    const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
    if (discountAmount > subtotal) throw Object.assign(new Error('Discount cannot be greater than the subtotal.'), { status: 400 });
    const total = subtotal - discountAmount + taxAmount;
    const invoiceId = `INV-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const sale = await ClinicSale.create({ invoiceId, idempotencyKey: idempotencyKey || undefined, patient: patient?._id, patientName: patient?.name || '', items: lines, subtotal, discount: discountAmount, tax: taxAmount, total, paymentMethod, paymentStatus, staff: req.user.id });
    await audit(req.user.id, 'sale.completed', 'sale', sale._id, `Recorded sale ${invoiceId}`, { total, paymentMethod, paymentStatus });
    return res.status(201).json({ success: true, sale });
  } catch (error) {
    for (const reservation of reservations) {
      await PharmacyMedicine.updateOne({ _id: reservation.medicineId }, { $inc: { stock: reservation.quantity } }).catch(() => {});
      for (const allocation of reservation.allocations) await PharmacyMedicine.updateOne({ _id: reservation.medicineId, 'batches._id': allocation.batchId }, { $inc: { 'batches.$.quantity': allocation.quantity } }).catch(() => {});
    }
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    if (error.code === 11000 && idempotencyKey) {
      const existing = await ClinicSale.findOne({ idempotencyKey }).select('+idempotencyKey').lean();
      if (existing) return res.status(200).json({ success: true, sale: existing, duplicate: true });
    }
    console.error('Create pharmacy sale error:', error.message);
    return res.status(500).json({ success: false, message: 'Sale could not be saved; reserved stock was restored where possible.' });
  }
}

async function createBill(req, res) {
  const { patientId, visitId, items, paymentMethod, paymentStatus = 'paid', discount = 0, tax = 0 } = req.body || {};
  const methods = ['cash', 'card', 'bank_transfer', 'mobile_wallet', 'other'];
  if (!validId(patientId) || !Array.isArray(items) || !items.length || items.length > 40 || !methods.includes(paymentMethod) || !['paid', 'pending'].includes(paymentStatus)) return res.status(400).json({ success: false, message: 'Choose a patient, add bill items, and select a valid payment method.' });
  const cleanItems = [];
  for (const item of items) {
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    const quantity = Number(item.quantity); const unitPrice = Number(item.unitPrice);
    if (!name || name.length > 200 || !Number.isInteger(quantity) || quantity < 1 || !Number.isFinite(unitPrice) || unitPrice < 0) return res.status(400).json({ success: false, message: 'Each clinic service needs a name, positive quantity, and non-negative price.' });
    cleanItems.push({ name, quantity, unitPrice, lineTotal: quantity * unitPrice });
  }
  const discountAmount = Number(discount); const taxAmount = Number(tax);
  if (!Number.isFinite(discountAmount) || discountAmount < 0 || !Number.isFinite(taxAmount) || taxAmount < 0) return res.status(400).json({ success: false, message: 'Discount and tax must be non-negative.' });
  const key = String(req.get('Idempotency-Key') || '').trim();
  if (key && !/^[a-zA-Z0-9_-]{16,100}$/.test(key)) return res.status(400).json({ success: false, message: 'Bill request key is invalid.' });
  try {
    if (key) { const previous = await ClinicBill.findOne({ idempotencyKey: key }).select('+idempotencyKey').lean(); if (previous) return res.json({ success: true, bill: previous, duplicate: true }); }
    const [patient, visit] = await Promise.all([
      ClinicPatient.findOne({ _id: patientId, active: true }).select('_id name patientId'),
      validId(visitId) ? ClinicVisit.findById(visitId).select('_id patient doctor') : Promise.resolve(null),
    ]);
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found.' });
    if (visit && String(visit.patient) !== String(patient._id)) return res.status(400).json({ success: false, message: 'Selected visit belongs to a different patient.' });
    const subtotal = cleanItems.reduce((sum, item) => sum + item.lineTotal, 0);
    if (discountAmount > subtotal) return res.status(400).json({ success: false, message: 'Discount cannot exceed the bill subtotal.' });
    const invoiceId = `CLN-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const bill = await ClinicBill.create({ invoiceId, idempotencyKey: key || undefined, patient: patient._id, patientName: patient.name, visit: visit?._id, items: cleanItems, subtotal, discount: discountAmount, tax: taxAmount, total: subtotal - discountAmount + taxAmount, paymentMethod, paymentStatus, staff: req.user.id });
    await audit(req.user.id, 'clinic_bill.created', 'clinic_bill', bill._id, `Recorded clinic bill ${bill.invoiceId}`, { total: bill.total, paymentMethod, paymentStatus });
    return res.status(201).json({ success: true, bill });
  } catch (error) {
    if (error.code === 11000 && key) { const previous = await ClinicBill.findOne({ idempotencyKey: key }).select('+idempotencyKey').lean(); if (previous) return res.json({ success: true, bill: previous, duplicate: true }); }
    console.error('Create clinic bill error:', error.message);
    return res.status(500).json({ success: false, message: 'Clinic bill could not be saved.' });
  }
}

async function refundBill(req, res) {
  if (!validId(req.params.id)) return idError(res);
  const amount = Number(req.body?.amount); const reason = String(req.body?.reason || '').trim();
  if (!Number.isFinite(amount) || amount <= 0 || !reason) return res.status(400).json({ success: false, message: 'Enter a positive refund amount and reason.' });
  try {
    const bill = await ClinicBill.findById(req.params.id);
    if (!bill || bill.status === 'void') return res.status(404).json({ success: false, message: 'Clinic bill not found.' });
    const remaining = bill.total - bill.refundedAmount;
    if (amount > remaining) return res.status(409).json({ success: false, message: `Maximum refundable amount is ${remaining}.` });
    const fullyRefunded = amount === remaining;
    const updated = await ClinicBill.findOneAndUpdate({ _id: bill._id, refundedAmount: bill.refundedAmount }, { $inc: { refundedAmount: amount }, $set: { refundReason: reason, status: fullyRefunded ? 'refunded' : 'partially_refunded', paymentStatus: fullyRefunded ? 'refunded' : 'partially_refunded' } }, { new: true });
    if (!updated) return res.status(409).json({ success: false, message: 'This bill changed while the refund was processing. Reload and try again.' });
    await audit(req.user.id, 'clinic_bill.refunded', 'clinic_bill', updated._id, `Refunded ${amount} for ${updated.invoiceId}`, { amount, reason });
    return res.json({ success: true, bill: updated });
  } catch (error) {
    console.error('Clinic bill refund error:', error.message);
    return res.status(500).json({ success: false, message: 'Clinic bill refund could not be completed.' });
  }
}

async function salesFilter(query) {
    const filter = { status: { $ne: 'void' } };
    if (query.from) { const from = dateStart(query.from); if (!from) return { error: 'Start date is invalid.' }; filter.createdAt = { ...filter.createdAt, $gte: from }; }
    if (query.to) { const to = dateEnd(query.to); if (!to) return { error: 'End date is invalid.' }; filter.createdAt = { ...filter.createdAt, $lte: to }; }
    if (query.paymentMethod) filter.paymentMethod = query.paymentMethod;
    if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;
    if (query.staffId) { if (!validId(query.staffId)) return { error: 'Staff filter is invalid.' }; filter.staff = query.staffId; }
    if (query.patientId) {
      if (validId(query.patientId)) filter.patient = query.patientId;
      else {
        const patients = await ClinicPatient.find({ patientId: new RegExp(`^${escapeRegex(query.patientId.trim())}$`, 'i') }).select('_id').lean();
        filter.patient = { $in: patients.map((patient) => patient._id) };
      }
    }
    if (query.medicineId) { if (!validId(query.medicineId)) return { error: 'Medicine filter is invalid.' }; filter['items.medicine'] = query.medicineId; }
    if (query.search) { const search = escapeRegex(query.search.trim()); filter.$or = [{ invoiceId: new RegExp(search, 'i') }, { patientName: new RegExp(search, 'i') }, { 'items.name': new RegExp(search, 'i') }]; }
    return { filter };
}

async function listSales(req, res) {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 30));
    const result = await salesFilter(req.query);
    if (result.error) return res.status(400).json({ success: false, message: result.error });
    const { filter } = result;
    const [sales, total, summary, payments, bestSellers] = await Promise.all([
      ClinicSale.find(filter).populate('patient', 'patientId name phone').populate('staff', 'name').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      ClinicSale.countDocuments(filter),
      ClinicSale.aggregate([{ $match: filter }, { $group: { _id: null, grossSales: { $sum: '$total' }, refunds: { $sum: '$refundedAmount' }, discounts: { $sum: '$discount' }, tax: { $sum: '$tax' }, transactions: { $sum: 1 }, itemsSold: { $sum: { $sum: '$items.quantity' } }, paid: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$total', 0] } }, pending: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, '$total', 0] } } } }]),
      ClinicSale.aggregate([{ $match: filter }, { $group: { _id: { method: '$paymentMethod', status: '$paymentStatus' }, amount: { $sum: '$total' }, transactions: { $sum: 1 } } }, { $sort: { '_id.method': 1, '_id.status': 1 } }]),
      ClinicSale.aggregate([{ $match: filter }, { $unwind: '$items' }, { $group: { _id: '$items.medicine', name: { $first: '$items.name' }, quantity: { $sum: '$items.quantity' }, revenue: { $sum: '$items.lineTotal' } } }, { $sort: { quantity: -1 } }, { $limit: 5 }]),
    ]);
    return res.json({ success: true, sales, total, page, pages: Math.ceil(total / limit), summary: summary[0] || { grossSales: 0, refunds: 0, discounts: 0, tax: 0, transactions: 0, itemsSold: 0, paid: 0, pending: 0 }, payments, bestSellers });
  } catch (error) {
    console.error('Clinic sales report error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load sales report.' });
  }
}

function csvCell(value) { const text = String(value ?? ''); return `"${text.replaceAll('"', '""')}"`; }
async function exportSales(req, res) {
  try {
    const result = await salesFilter(req.query);
    if (result.error) return res.status(400).json({ success: false, message: result.error });
    const { filter } = result;
    const cursor = ClinicSale.find(filter).populate('patient', 'patientId name').populate('staff', 'name').sort({ createdAt: -1 }).cursor();
    res.status(200); res.set('Content-Type', 'text/csv; charset=utf-8'); res.set('Content-Disposition', 'attachment; filename="clinic-sales.csv"');
    res.write('Invoice,Date,Patient ID,Patient,Items,Subtotal,Discount,Tax,Refunded,Net,Payment method,Payment status,Staff\r\n');
    for await (const sale of cursor) {
      const items = sale.items.map((item) => `${item.name} x${item.quantity} @ ${item.unitPrice}`).join('; ');
      const cells = [sale.invoiceId, sale.createdAt.toISOString(), sale.patient?.patientId, sale.patient?.name || sale.patientName, items, sale.subtotal, sale.discount, sale.tax, sale.refundedAmount, sale.total - sale.refundedAmount, sale.paymentMethod, sale.paymentStatus, sale.staff?.name];
      res.write(`${cells.map(csvCell).join(',')}\r\n`);
    }
    return res.end();
  } catch (error) {
    console.error('Export clinic sales error:', error.message);
    if (!res.headersSent) return res.status(500).json({ success: false, message: 'Unable to export sales report.' });
    return res.end();
  }
}

async function getSale(req, res) {
  if (!validId(req.params.id)) return idError(res);
  try {
    const sale = await ClinicSale.findById(req.params.id).populate('patient', 'patientId name phone').populate('staff', 'name role').populate('items.medicine', 'name strength dosageForm').lean();
    if (!sale) return res.status(404).json({ success: false, message: 'Sale not found.' });
    return res.json({ success: true, sale });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to load this sale.' });
  }
}

async function refundSale(req, res) {
  if (!validId(req.params.id)) return idError(res);
  const { amount, reason, restock = false } = req.body || {};
  const refundAmount = Number(amount);
  if (!Number.isFinite(refundAmount) || refundAmount <= 0 || typeof reason !== 'string' || !reason.trim()) return res.status(400).json({ success: false, message: 'Enter a positive refund amount and reason.' });
  try {
    const sale = await ClinicSale.findById(req.params.id);
    if (!sale || sale.status === 'void') return res.status(404).json({ success: false, message: 'Completed sale not found.' });
    const remaining = sale.total - sale.refundedAmount;
    if (refundAmount > remaining) return res.status(409).json({ success: false, message: `The maximum remaining refundable amount is ${remaining}.` });
    const fullRefund = refundAmount === remaining;
    if (restock && !fullRefund) return res.status(400).json({ success: false, message: 'Restock is only available with a full sale refund.' });
    const updated = await ClinicSale.findOneAndUpdate({ _id: sale._id, refundedAmount: sale.refundedAmount, total: { $gte: sale.refundedAmount + refundAmount } }, { $inc: { refundedAmount: refundAmount }, $set: { refundReason: reason.trim(), status: fullRefund ? 'refunded' : 'partially_refunded', paymentStatus: fullRefund ? 'refunded' : 'partially_refunded' } }, { new: true });
    if (!updated) return res.status(409).json({ success: false, message: 'This sale changed while the refund was being processed. Reload and try again.' });
    if (restock) {
      for (const item of sale.items) {
        for (const allocation of item.batchAllocations || []) {
          const result = await PharmacyMedicine.updateOne({ _id: item.medicine, 'batches._id': allocation.batchId }, { $inc: { stock: allocation.quantity, 'batches.$.quantity': allocation.quantity } });
          if (!result.modifiedCount) console.error(`Refund restock needs review for sale ${updated.invoiceId} and medicine ${item.medicine}`);
        }
      }
    }
    await audit(req.user.id, 'sale.refunded', 'sale', updated._id, `Refunded ${refundAmount} for ${updated.invoiceId}`, { amount: refundAmount, reason: reason.trim(), restock: Boolean(restock) });
    return res.json({ success: true, sale: updated });
  } catch (error) {
    console.error('Clinic refund error:', error.message);
    return res.status(500).json({ success: false, message: 'Refund could not be completed.' });
  }
}

async function listStaff(req, res) {
  try {
    const users = await User.find({ role: { $in: staffRoles } }).select('name email phone role active createdAt').sort({ role: 1, name: 1 }).lean();
    return res.json({ success: true, staff: users.map((user) => ({ ...user, active: user.active !== false })) });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to load staff accounts.' });
  }
}

async function listDoctors(req, res) {
  try {
    const doctors = await User.find({ role: 'doctor', active: { $ne: false } }).select('name email').sort({ name: 1 }).lean();
    return res.json({ success: true, doctors });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to load clinic doctors.' });
  }
}

async function createStaff(req, res) {
  const { name, email, phone = '', password, role } = req.body || {};
  if (typeof name !== 'string' || !name.trim() || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || typeof password !== 'string' || password.length < 12 || !['doctor', 'receptionist', 'pharmacist', 'admin'].includes(role)) return res.status(400).json({ success: false, message: 'Enter a name, valid email, 12+ character temporary password, and staff role.' });
  try {
    const normalizedEmail = email.trim().toLowerCase();
    if (await User.exists({ email: normalizedEmail })) return res.status(409).json({ success: false, message: 'An account already uses this email.' });
    const user = await User.create({ name: name.trim(), email: normalizedEmail, phone: String(phone).trim(), password: await bcrypt.hash(password, 12), role, active: true });
    await audit(req.user.id, 'staff.created', 'staff', user._id, `Created ${role} account ${normalizedEmail}`, { role });
    return res.status(201).json({ success: true, staff: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, active: user.active } });
  } catch (error) {
    console.error('Create clinic staff error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to create staff account.' });
  }
}

async function updateStaffActive(req, res) {
  if (!validId(req.params.id)) return idError(res);
  if (String(req.params.id) === String(req.user.id)) return res.status(400).json({ success: false, message: 'You cannot deactivate your own account.' });
  try {
    const user = await User.findOneAndUpdate({ _id: req.params.id, role: { $in: staffRoles } }, { active: req.body?.active === true }, { new: true }).select('name email role active');
    if (!user) return res.status(404).json({ success: false, message: 'Staff account not found.' });
    await audit(req.user.id, 'staff.access_changed', 'staff', user._id, `${user.active ? 'Activated' : 'Deactivated'} staff account`, { role: user.role, active: user.active });
    return res.json({ success: true, staff: user });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to update staff access.' });
  }
}

async function listActivity(req, res) {
  try {
    const activity = await ClinicAuditLog.find().sort({ createdAt: -1 }).limit(100).populate('actor', 'name email role').lean();
    return res.json({ success: true, activity });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to load audit history.' });
  }
}

function getSettings(req, res) {
  return res.json({ success: true, integrations: {
    cloudinary: Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET),
    whatsapp: Boolean(process.env.WA_ACCESS_TOKEN && process.env.WA_PHONE_NUMBER_ID && process.env.WA_RESET_TEMPLATE_NAME && process.env.APP_BASE_URL),
    database: mongoose.connection.readyState === 1,
  } });
}

module.exports = { getOverview, listMedicines, createMedicine, updateMedicine, adjustStock, listPatients, getPatient, createPatient, updatePatient, listAppointments, createAppointment, updateAppointment, listVisits, createVisit, createSale, listSales, exportSales, getSale, refundSale, listStaff, listDoctors, createStaff, updateStaffActive, listActivity, getSettings };
