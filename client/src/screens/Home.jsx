'use client';
import { useEffect, useMemo, useState } from 'react';
import { Link } from '../lib/navigation';
import api from '../api/axios';

export const demoProducts = [
  { _id: 'p1', name: 'Everyday Canvas Tote', category: 'Accessories', price: 2450, store: { name: 'Sunday Studio', slug: 'sunday-studio' }, imageUrl: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=900&q=85', label: 'BESTSELLER' },
  { _id: 'p2', name: 'Ceramic Morning Mug', category: 'Home & living', price: 1850, store: { name: 'Clay & Co.', slug: 'clay-and-co' }, imageUrl: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=900&q=85', label: 'HANDMADE' },
  { _id: 'p3', name: 'Essential Knit Set', category: 'Clothing', price: 6200, store: { name: 'Soft Season', slug: 'soft-season' }, imageUrl: 'https://images.unsplash.com/photo-1551163943-3f6a855d1153?auto=format&fit=crop&w=900&q=85', label: 'JUST IN' },
  { _id: 'p4', name: 'Sunday Skin Ritual', category: 'Beauty', price: 3200, store: { name: 'Kindred Skin', slug: 'kindred-skin' }, imageUrl: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=900&q=85', label: 'COMMUNITY PICK' },
  { _id: 'p5', name: 'Sculpted Brass Hoops', category: 'Accessories', price: 2900, store: { name: 'Morrow Objects', slug: 'morrow-objects' }, imageUrl: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p6', name: 'Soft Form Cushion', category: 'Home & living', price: 4400, store: { name: 'Sunday Studio', slug: 'sunday-studio' }, imageUrl: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p7', name: 'Daily Carry Bottle', category: 'Lifestyle', price: 2100, store: { name: 'Field Notes Supply', slug: 'field-notes-supply' }, imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p8', name: 'Weekend Leather Wallet', category: 'Accessories', price: 5100, store: { name: 'Morrow Objects', slug: 'morrow-objects' }, imageUrl: 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p9', name: 'Linen Weekend Shirt', category: 'Clothing', price: 4800, store: { name: 'Soft Season', slug: 'soft-season' }, imageUrl: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p10', name: 'Relaxed Cotton Tee', category: 'Clothing', price: 1950, store: { name: 'Sunday Studio', slug: 'sunday-studio' }, imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p11', name: 'Everyday Denim Jacket', category: 'Clothing', price: 7200, store: { name: 'Soft Season', slug: 'soft-season' }, imageUrl: 'https://images.unsplash.com/photo-1543076447-215ad9ba6923?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p12', name: 'Ribbed Lounge Set', category: 'Clothing', price: 5600, store: { name: 'Soft Season', slug: 'soft-season' }, imageUrl: 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p13', name: 'Soft Knit Cardigan', category: 'Clothing', price: 6800, store: { name: 'Sunday Studio', slug: 'sunday-studio' }, imageUrl: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p14', name: 'Everyday Crossbody', category: 'Accessories', price: 3950, store: { name: 'Morrow Objects', slug: 'morrow-objects' }, imageUrl: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p15', name: 'Woven Market Basket', category: 'Accessories', price: 3300, store: { name: 'Sunday Studio', slug: 'sunday-studio' }, imageUrl: 'https://images.unsplash.com/photo-1591561954557-26941169b49e?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p16', name: 'Everyday Sunglasses', category: 'Accessories', price: 2700, store: { name: 'Morrow Objects', slug: 'morrow-objects' }, imageUrl: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p17', name: 'Minimal Silver Necklace', category: 'Accessories', price: 3450, store: { name: 'Morrow Objects', slug: 'morrow-objects' }, imageUrl: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p18', name: 'Hand-thrown Dinner Bowl', category: 'Home & living', price: 2250, store: { name: 'Clay & Co.', slug: 'clay-and-co' }, imageUrl: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p19', name: 'Speckled Stoneware Vase', category: 'Home & living', price: 3800, store: { name: 'Clay & Co.', slug: 'clay-and-co' }, imageUrl: 'https://images.unsplash.com/photo-1578500494198-246f612d3b3d?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p20', name: 'Linen Table Runner', category: 'Home & living', price: 2950, store: { name: 'Sunday Studio', slug: 'sunday-studio' }, imageUrl: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p21', name: 'Amber Glass Candle', category: 'Home & living', price: 1650, store: { name: 'Kindred Home', slug: 'kindred-home' }, imageUrl: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p22', name: 'Woven Wall Hanging', category: 'Home & living', price: 5200, store: { name: 'Clay & Co.', slug: 'clay-and-co' }, imageUrl: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p23', name: 'Daily Hydration Serum', category: 'Beauty', price: 2850, store: { name: 'Kindred Skin', slug: 'kindred-skin' }, imageUrl: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p24', name: 'Cloud-soft Face Cream', category: 'Beauty', price: 2400, store: { name: 'Kindred Skin', slug: 'kindred-skin' }, imageUrl: 'https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p25', name: 'Rosewater Face Mist', category: 'Beauty', price: 1750, store: { name: 'Kindred Skin', slug: 'kindred-skin' }, imageUrl: 'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p26', name: 'Everyday Lip Tint Set', category: 'Beauty', price: 1950, store: { name: 'Sunday Skin', slug: 'sunday-skin' }, imageUrl: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p27', name: 'Botanical Hair Oil', category: 'Beauty', price: 2200, store: { name: 'Kindred Skin', slug: 'kindred-skin' }, imageUrl: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p28', name: 'Citrus Hand Balm', category: 'Beauty', price: 1250, store: { name: 'Sunday Skin', slug: 'sunday-skin' }, imageUrl: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p29', name: 'Pocket Film Camera', category: 'Lifestyle', price: 8900, store: { name: 'Field Notes Supply', slug: 'field-notes-supply' }, imageUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p30', name: 'Weekend Journal', category: 'Lifestyle', price: 1350, store: { name: 'Field Notes Supply', slug: 'field-notes-supply' }, imageUrl: 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p31', name: 'Trail Daypack', category: 'Lifestyle', price: 6500, store: { name: 'Field Notes Supply', slug: 'field-notes-supply' }, imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p32', name: 'Pour-over Coffee Set', category: 'Lifestyle', price: 3600, store: { name: 'Clay & Co.', slug: 'clay-and-co' }, imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p33', name: 'Everyday Yoga Mat', category: 'Lifestyle', price: 4200, store: { name: 'Field Notes Supply', slug: 'field-notes-supply' }, imageUrl: 'https://images.unsplash.com/photo-1592432678016-e910b452f9a2?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p34', name: 'Wooden Desk Organizer', category: 'Lifestyle', price: 3100, store: { name: 'Kindred Home', slug: 'kindred-home' }, imageUrl: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p35', name: 'Classic White Sneakers', category: 'Clothing', price: 5900, store: { name: 'Soft Season', slug: 'soft-season' }, imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p36', name: 'Lightweight Everyday Hoodie', category: 'Clothing', price: 4600, store: { name: 'Sunday Studio', slug: 'sunday-studio' }, imageUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p37', name: 'Relaxed Linen Trousers', category: 'Clothing', price: 4200, store: { name: 'Soft Season', slug: 'soft-season' }, imageUrl: 'https://www.ottwaythelabel.com/cdn/shop/products/DSC09957_b17bb9b6-d625-4018-8367-6dcaf57524f0.jpg?v=1669597664&width=900' },
  { _id: 'p38', name: 'Everyday Leather Belt', category: 'Accessories', price: 1850, store: { name: 'Morrow Objects', slug: 'morrow-objects' }, imageUrl: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p39', name: 'Minimal Gold Bracelet', category: 'Accessories', price: 2400, store: { name: 'Morrow Objects', slug: 'morrow-objects' }, imageUrl: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p40', name: 'Canvas Everyday Backpack', category: 'Accessories', price: 3900, store: { name: 'Field Notes Supply', slug: 'field-notes-supply' }, imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p41', name: 'Handwoven Cotton Scarf', category: 'Accessories', price: 2100, store: { name: 'Sunday Studio', slug: 'sunday-studio' }, imageUrl: 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p42', name: 'Stoneware Breakfast Plate', category: 'Home & living', price: 1450, store: { name: 'Clay & Co.', slug: 'clay-and-co' }, imageUrl: 'https://images.unsplash.com/photo-1493106641515-6b5631de4bb9?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p43', name: 'Textured Ceramic Planter', category: 'Home & living', price: 1950, store: { name: 'Clay & Co.', slug: 'clay-and-co' }, imageUrl: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p44', name: 'Soft Cotton Throw Blanket', category: 'Home & living', price: 5200, store: { name: 'Sunday Studio', slug: 'sunday-studio' }, imageUrl: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p45', name: 'Wooden Serving Board', category: 'Home & living', price: 2600, store: { name: 'Kindred Home', slug: 'kindred-home' }, imageUrl: 'https://images.unsplash.com/photo-1603199506016-b9a594b593c0?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p46', name: 'Botanical Soy Candle', category: 'Home & living', price: 1550, store: { name: 'Kindred Home', slug: 'kindred-home' }, imageUrl: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p47', name: 'Gentle Daily Cleanser', category: 'Beauty', price: 1650, store: { name: 'Kindred Skin', slug: 'kindred-skin' }, imageUrl: 'https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p48', name: 'Nourishing Body Butter', category: 'Beauty', price: 2200, store: { name: 'Sunday Skin', slug: 'sunday-skin' }, imageUrl: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p49', name: 'Everyday Mineral Sunscreen', category: 'Beauty', price: 1950, store: { name: 'Kindred Skin', slug: 'kindred-skin' }, imageUrl: 'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p50', name: 'Lavender Bath Soak', category: 'Beauty', price: 1350, store: { name: 'Sunday Skin', slug: 'sunday-skin' }, imageUrl: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p51', name: 'Pocket Sketchbook Set', category: 'Lifestyle', price: 1250, store: { name: 'Field Notes Supply', slug: 'field-notes-supply' }, imageUrl: 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p52', name: 'Insulated Travel Tumbler', category: 'Lifestyle', price: 1850, store: { name: 'Field Notes Supply', slug: 'field-notes-supply' }, imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p53', name: 'Compact Travel Umbrella', category: 'Lifestyle', price: 2200, store: { name: 'Field Notes Supply', slug: 'field-notes-supply' }, imageUrl: 'https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p54', name: 'Reusable Market Tote', category: 'Lifestyle', price: 950, store: { name: 'Sunday Studio', slug: 'sunday-studio' }, imageUrl: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p55', name: 'Pour-over Coffee Dripper', category: 'Home & living', price: 1750, store: { name: 'Clay & Co.', slug: 'clay-and-co' }, imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p56', name: 'Linen Cushion Cover', category: 'Home & living', price: 1850, store: { name: 'Sunday Studio', slug: 'sunday-studio' }, imageUrl: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p57', name: 'Everyday Hoop Earrings', category: 'Accessories', price: 1650, store: { name: 'Morrow Objects', slug: 'morrow-objects' }, imageUrl: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p58', name: 'Classic Analog Watch', category: 'Accessories', price: 6400, store: { name: 'Morrow Objects', slug: 'morrow-objects' }, imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p59', name: 'Everyday Oxford Shirt', category: 'Clothing', price: 3850, store: { name: 'Soft Season', slug: 'soft-season' }, imageUrl: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p60', name: 'Soft Cotton Sweatshirt', category: 'Clothing', price: 4200, store: { name: 'Sunday Studio', slug: 'sunday-studio' }, imageUrl: 'https://images.unsplash.com/photo-1578681994506-b8f463449011?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p61', name: 'Everyday Running Shoes', category: 'Clothing', price: 6800, store: { name: 'Field Notes Supply', slug: 'field-notes-supply' }, imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p62', name: 'Relaxed Summer Dress', category: 'Clothing', price: 5100, store: { name: 'Soft Season', slug: 'soft-season' }, imageUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p63', name: 'Ribbed Everyday Socks', category: 'Clothing', price: 650, store: { name: 'Sunday Studio', slug: 'sunday-studio' }, imageUrl: 'https://images.unsplash.com/photo-1582966772680-860e372bb558?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p64', name: 'Slim Card Holder', category: 'Accessories', price: 1450, store: { name: 'Morrow Objects', slug: 'morrow-objects' }, imageUrl: 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p65', name: 'Pearl Drop Earrings', category: 'Accessories', price: 1950, store: { name: 'Morrow Objects', slug: 'morrow-objects' }, imageUrl: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p66', name: 'Everyday Bucket Hat', category: 'Accessories', price: 1250, store: { name: 'Sunday Studio', slug: 'sunday-studio' }, imageUrl: 'https://images.unsplash.com/photo-1521369909029-2afed882baee?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p67', name: 'Woven Phone Crossbody', category: 'Accessories', price: 2150, store: { name: 'Morrow Objects', slug: 'morrow-objects' }, imageUrl: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p68', name: 'Handmade Ceramic Teapot', category: 'Home & living', price: 3400, store: { name: 'Clay & Co.', slug: 'clay-and-co' }, imageUrl: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p69', name: 'Set of Stoneware Mugs', category: 'Home & living', price: 2800, store: { name: 'Clay & Co.', slug: 'clay-and-co' }, imageUrl: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p70', name: 'Minimal Table Lamp', category: 'Home & living', price: 5600, store: { name: 'Kindred Home', slug: 'kindred-home' }, imageUrl: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p71', name: 'Cotton Kitchen Towel Set', category: 'Home & living', price: 1350, store: { name: 'Sunday Studio', slug: 'sunday-studio' }, imageUrl: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p72', name: 'Glass Bud Vase Trio', category: 'Home & living', price: 2250, store: { name: 'Clay & Co.', slug: 'clay-and-co' }, imageUrl: 'https://images.unsplash.com/photo-1578500494198-246f612d3b3d?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p73', name: 'Daily Face Cleanser', category: 'Beauty', price: 1550, store: { name: 'Kindred Skin', slug: 'kindred-skin' }, imageUrl: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p74', name: 'Rosehip Night Facial Oil', category: 'Beauty', price: 2450, store: { name: 'Kindred Skin', slug: 'kindred-skin' }, imageUrl: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p75', name: 'Hydrating Lip Balm Duo', category: 'Beauty', price: 950, store: { name: 'Sunday Skin', slug: 'sunday-skin' }, imageUrl: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p76', name: 'Aloe Daily Moisturizer', category: 'Beauty', price: 1850, store: { name: 'Kindred Skin', slug: 'kindred-skin' }, imageUrl: 'https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p77', name: 'Natural Bath and Body Set', category: 'Beauty', price: 3200, store: { name: 'Sunday Skin', slug: 'sunday-skin' }, imageUrl: 'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p78', name: 'Stainless Steel Water Bottle', category: 'Lifestyle', price: 1950, store: { name: 'Field Notes Supply', slug: 'field-notes-supply' }, imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p79', name: 'Daily Planner Notebook', category: 'Lifestyle', price: 1150, store: { name: 'Field Notes Supply', slug: 'field-notes-supply' }, imageUrl: 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p80', name: 'Compact Yoga Mat', category: 'Lifestyle', price: 3900, store: { name: 'Field Notes Supply', slug: 'field-notes-supply' }, imageUrl: 'https://images.unsplash.com/photo-1592432678016-e910b452f9a2?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p81', name: 'Reusable Lunch Box', category: 'Lifestyle', price: 1750, store: { name: 'Kindred Home', slug: 'kindred-home' }, imageUrl: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p82', name: 'Compact Bluetooth Speaker', category: 'Lifestyle', price: 5200, store: { name: 'Field Notes Supply', slug: 'field-notes-supply' }, imageUrl: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p83', name: 'Wooden Serving Spoon Set', category: 'Home & living', price: 1250, store: { name: 'Kindred Home', slug: 'kindred-home' }, imageUrl: 'https://images.unsplash.com/photo-1603199506016-b9a594b593c0?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p84', name: 'Canvas Zip Pouch', category: 'Accessories', price: 850, store: { name: 'Sunday Studio', slug: 'sunday-studio' }, imageUrl: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p85', name: 'Gentle Hand Wash', category: 'Beauty', price: 1150, store: { name: 'Kindred Skin', slug: 'kindred-skin' }, imageUrl: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p86', name: 'Woven Cotton Bath Towel', category: 'Home & living', price: 2450, store: { name: 'Sunday Studio', slug: 'sunday-studio' }, imageUrl: 'https://images.unsplash.com/photo-1600369671236-e74521d4b6ad?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p87', name: 'Everyday Leather Sandals', category: 'Clothing', price: 4400, store: { name: 'Soft Season', slug: 'soft-season' }, imageUrl: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p88', name: 'Minimal Pendant Necklace', category: 'Accessories', price: 2750, store: { name: 'Morrow Objects', slug: 'morrow-objects' }, imageUrl: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p89', name: 'Small Batch Ground Coffee', category: 'Lifestyle', price: 1450, store: { name: 'Clay & Co.', slug: 'clay-and-co' }, imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=85' },
  { _id: 'p90', name: 'Handmade Incense Holder', category: 'Home & living', price: 1100, store: { name: 'Clay & Co.', slug: 'clay-and-co' }, imageUrl: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=900&q=85' },
];
const categories = ['Everything', 'Clothing', 'Accessories', 'Home & living', 'Beauty', 'Lifestyle'];
const formatPrice = (value) => `Rs. ${Number(value || 0).toLocaleString('en-PK')}`;

export default function Home() {
  const [products, setProducts] = useState(demoProducts);
  const [category, setCategory] = useState('Everything');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState(0);
  const [notice, setNotice] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [bag, setBag] = useState([]);
  const [checkout, setCheckout] = useState({ customerName: '', phone: '', address: '' });
  const [ordering, setOrdering] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const logout = () => { localStorage.removeItem('token'); localStorage.removeItem('user'); window.location.assign('/'); };

  useEffect(() => {
    api.get('/products').then(({ data }) => { if (data.products?.length) setProducts(data.products); }).catch(() => {});
  }, []);

  useEffect(() => {
    const syncCart = () => {
      try { const items = JSON.parse(localStorage.getItem('markethub-cart-items') || '[]'); setBag(items); setCart(items.length); } catch { setBag([]); setCart(0); }
    };
    syncCart();
    setIsLoggedIn(Boolean(localStorage.getItem('token')));
    try { setCustomerName(JSON.parse(localStorage.getItem('user') || '{}').name?.trim().split(/\s+/)[0] || ''); } catch { setCustomerName(''); }
    window.addEventListener('market-cart-updated', syncCart);
    return () => window.removeEventListener('market-cart-updated', syncCart);
  }, []);

  const visibleProducts = useMemo(() => products.filter((product) => {
    const matchesCategory = category === 'Everything' || product.category?.toLowerCase() === category.toLowerCase();
    const matchesSearch = `${product.name} ${product.category} ${product.store?.name}`.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  }), [products, category, search]);
  const featuredProducts = visibleProducts.slice(0, 8);

  const addToBag = (product) => {
    if (String(product._id).startsWith('p')) { setNotice('These are sample items. Create a store and add a real product to try checkout.'); window.setTimeout(() => setNotice(''), 2800); return; }
    const nextBag = [...bag, { productId: product._id, name: product.name, price: product.price, imageUrl: product.imageUrl || demoProducts[0].imageUrl, storeName: product.store?.name || 'Independent shop' }];
    const next = nextBag.length;
    setBag(nextBag); setCart(next);
    localStorage.setItem('markethub-cart-items', JSON.stringify(nextBag));
    localStorage.setItem('markethub-cart', String(next));
    setNotice(`${product.name} added to your bag`);
    window.setTimeout(() => setNotice(''), 2400);
  };

  const placeOrder = async (event) => {
    event.preventDefault();
    if (!localStorage.getItem('token')) {
      setNotice('Log in to place your order. Your bag will be here when you return.');
      window.setTimeout(() => { window.location.href = '/login?next=%2Fcart'; }, 900);
      return;
    }
    setOrdering(true);
    try {
      const { data } = await api.post('/orders', { ...checkout, items: bag.map((item) => ({ productId: item.productId, quantity: 1 })) }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      setBag([]); setCart(0); localStorage.removeItem('markethub-cart-items'); localStorage.setItem('markethub-cart', '0');
      setNotice(`${data.message} Order #${data.order.id.slice(-6)}`); setCartOpen(false);
    } catch (error) { setNotice(error.response?.data?.message || 'Order could not be placed. Please try again.'); }
    finally { setOrdering(false); }
  };

  return <div className="marketplace">
    <div className="announcement">A little more you. A little less ordinary. <span>Discover independent shops <span aria-hidden="true">↗</span></span></div>
    <header className="site-header">
      <Link className="brand" to="/" aria-label="MarketHub home">market<span>hub</span><i>®</i></Link>
      <nav className="main-nav" aria-label="Main navigation"><Link to="/discover">Discover</Link><Link to="/shops">Shops</Link><a href="#our-story">Our story</a></nav>
      <div className="header-actions">
        <label className="search-box"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search the marketplace" aria-label="Search products" /></label>
        <Link className="header-login" to={isLoggedIn ? '/dashboard' : '/login'}>{isLoggedIn ? 'My account' : 'Log in'}</Link>
        {isLoggedIn && <><Link className="header-login" to="/orders">My orders</Link><button className="logout-button" type="button" onClick={logout}>Log out</button></>}
        <Link className="bag-button" to="/cart" aria-label={`Shopping bag, ${cart} items`}>Bag <span>{cart}</span></Link>
      </div>
    </header>

    {isLoggedIn && <section className="customer-welcome" aria-label="Your marketplace welcome">
      <div><span className="eyebrow">YOUR MARKETPLACE, YOUR WAY</span><h1>Welcome back{customerName ? `, ${customerName}` : ''}<span>.</span></h1><p>Your next favourite find is waiting somewhere in the market.</p></div>
      <div className="customer-welcome-actions"><Link to="/orders">Track your orders <span aria-hidden="true">↗</span></Link><Link to="/discover">Explore the market <span aria-hidden="true">→</span></Link></div>
      <span className="customer-welcome-flower" aria-hidden="true">✳</span>
    </section>}

    <main>
      <section className="hero-banner">
        <div className="hero-copy"><span className="eyebrow">A MARKETPLACE WITH A LITTLE MORE MEANING</span><h1>Good things.<br /><em>Good people.</em></h1><p>Thoughtful finds from independent shops, makers, and the people behind them.</p><Link className="button button-dark" to="/discover">Find your next favourite <span>↗</span></Link><div className="hero-footnote"><span className="tiny-stars">✳ ✳ ✳</span> Small shops. Big heart.</div></div>
        <div className="hero-art" aria-label="A collection of independent market finds"><div className="art-note">Made with care,<br />found with love.</div><img className="hero-main-image" src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1100&q=90" alt="Thoughtfully styled clothing and accessories" /><div className="hero-stamp">SHOP<br />SMALL<br /><span>♥</span></div><div className="photo-caption">A slower kind of shopping · Est. 2026</div></div>
      </section>

      <section className="category-strip" aria-label="Shop by category">{categories.slice(1).map((item, index) => <Link key={item} className="category-pill" to={`/category/${encodeURIComponent(item.toLowerCase().replaceAll(' ','-'))}`}><span className={`category-dot dot-${index}`} aria-hidden="true">{['✳', '◒', '⌂', '✿', '↗'][index]}</span>{item}<span className="category-arrow">↗</span></Link>)}</section>

      <section className="product-section" id="discover">
        <div className="section-heading"><div><span className="eyebrow">THE MARKET, RIGHT NOW</span><h2>Picked with <em>purpose.</em></h2></div><Link className="text-link" to="/discover">Browse all finds <span>↗</span></Link></div>
        <div className="filters" role="group" aria-label="Filter products by category">{categories.map((item) => <button key={item} className={category === item ? 'filter-chip active' : 'filter-chip'} onClick={() => setCategory(item)}>{item}</button>)}</div>
        {featuredProducts.length ? <div className="product-grid" id="product-grid">{featuredProducts.map((product, index) => <article className="product-card" key={product._id}><Link className="product-image" to={String(product._id).startsWith('p') ? '/shops' : `/product/${product._id}`}><img src={product.imageUrl || demoProducts[index % demoProducts.length].imageUrl} alt={product.name} loading="lazy" />{product.label && <span className="product-label">{product.label}</span>}<span className="product-heart" aria-hidden="true">♡</span></Link><div className="product-info"><div className="product-meta"><Link to={product.store?.slug ? `/store/${product.store.slug}` : '/shops'}>{product.store?.name || 'Independent shop'}</Link><span>✳ 4.9</span></div><h3>{product.name}</h3><div className="product-bottom"><strong>{formatPrice(product.price)}</strong><button onClick={() => addToBag(product)} aria-label={`Add ${product.name} to bag`}>Add to bag <span aria-hidden="true">+</span></button></div></div></article>)}</div> : <div className="empty-products"><span>✳</span><p>No finds in that corner yet.</p><button onClick={() => { setCategory('Everything'); setSearch(''); }}>See everything</button></div>}
      </section>

      <section className="maker-banner"><div className="maker-photo"><img src="https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=1200&q=85" alt="A maker carefully preparing a handmade product" loading="lazy" /></div><div className="maker-copy"><span className="eyebrow">A GOOD PLACE TO BEGIN</span><h2>Made by people.<br /><em>Not algorithms.</em></h2><p>Meet the makers, small businesses, and big ideas turning everyday shopping into something personal.</p><Link className="button button-light" to="/shops">Meet the shops <span>↗</span></Link><span className="maker-aside">YOUR NEXT FAVOURITE THING IS AROUND HERE SOMEWHERE</span></div><span className="banner-sparkle" aria-hidden="true">✳</span></section>

      <section className="seller-cta" id="our-story"><div className="seller-icon" aria-hidden="true">✳</div><div><span className="eyebrow">YOUR IDEA DESERVES A WINDOW</span><h2>Have something good to share?</h2><p>Open your own little corner of the marketplace. Your store is yours to make.</p></div><Link className="button button-dark" to="/create-store">Open your shop <span>↗</span></Link></section>
    </main>

    <footer className="site-footer"><Link className="brand" to="/">market<span>hub</span><i>®</i></Link><span>A marketplace made for the makers, the finders, and the good stuff in between.</span><div><Link to="/login">Log in</Link><Link to="/signup">Join the market</Link><Link to="/dashboard">Seller space</Link></div><small>© 2026 MarketHub. Made for good things.</small></footer>
    {notice && <div className="toast" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss">×</button></div>}
    {cartOpen && <div className="cart-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setCartOpen(false); }}><section className="cart-panel" role="dialog" aria-modal="true" aria-labelledby="cart-title"><div className="cart-heading"><div><span className="eyebrow">A FEW GOOD FINDS</span><h2 id="cart-title">Your bag <span>({bag.length})</span></h2></div><button onClick={() => setCartOpen(false)} aria-label="Close bag">×</button></div>{bag.length ? <><div className="cart-items">{bag.map((item, index) => <div className="cart-item" key={`${item.productId}-${index}`}><img src={item.imageUrl} alt="" /><div><strong>{item.name}</strong><span>{item.storeName}</span><b>{formatPrice(item.price)}</b></div><button onClick={() => { const next = bag.filter((_, itemIndex) => itemIndex !== index); setBag(next); setCart(next.length); localStorage.setItem('markethub-cart-items', JSON.stringify(next)); localStorage.setItem('markethub-cart', String(next.length)); }} aria-label={`Remove ${item.name}`}>×</button></div>)}</div><div className="cart-total"><span>Subtotal</span><strong>{formatPrice(bag.reduce((sum, item) => sum + Number(item.price), 0))}</strong></div><form className="checkout-form" onSubmit={placeOrder}><p>Delivery details</p><label>Your name<input required value={checkout.customerName} onChange={(event) => setCheckout({ ...checkout, customerName: event.target.value })} autoComplete="name" /></label><label>Phone number<input required value={checkout.phone} onChange={(event) => setCheckout({ ...checkout, phone: event.target.value })} autoComplete="tel" /></label><label>Delivery address<textarea required value={checkout.address} onChange={(event) => setCheckout({ ...checkout, address: event.target.value })} autoComplete="street-address" rows={2} /></label><span className="payment-label">Payment method</span><div className="payment-choice">Cash on delivery</div><button className="create-submit" disabled={ordering}>{ordering ? 'Continuing…' : isLoggedIn ? 'Place cash-on-delivery order' : 'Log in to place your order'}</button>{!isLoggedIn && <p className="checkout-login">Already have an account? <Link to="/login">Log in</Link> or <Link to="/signup">sign up</Link> — we'll keep your bag.</p>}</form></> : <div className="cart-empty"><span>✳</span><p>Your bag is waiting for something lovely.</p><button onClick={() => setCartOpen(false)}>Keep browsing</button></div>}</section></div>}
  </div>;
}
