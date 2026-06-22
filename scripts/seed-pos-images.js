#!/usr/bin/env node
/**
 * Generate SVG food images (white background) and upload to Supabase Storage,
 * then update pos_products.image_url
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─── SVG food illustrations ───────────────────────────────────────────────
const PRODUCTS = [
  {
    sku: 'PRD-001',
    name: 'Nasi Goreng Spesial',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <rect width="400" height="400" fill="white"/>
  <!-- plate -->
  <ellipse cx="200" cy="240" rx="155" ry="30" fill="#e8e0d5"/>
  <ellipse cx="200" cy="230" rx="150" ry="110" fill="#f5f0e8"/>
  <!-- rice base -->
  <ellipse cx="200" cy="210" rx="120" ry="80" fill="#FDE68A"/>
  <!-- fried rice texture -->
  <ellipse cx="165" cy="205" rx="18" ry="12" fill="#FBBF24" transform="rotate(-15 165 205)"/>
  <ellipse cx="200" cy="195" rx="22" ry="14" fill="#F59E0B" transform="rotate(5 200 195)"/>
  <ellipse cx="235" cy="208" rx="18" ry="12" fill="#FBBF24" transform="rotate(20 235 208)"/>
  <ellipse cx="185" cy="225" rx="16" ry="10" fill="#F59E0B" transform="rotate(-8 185 225)"/>
  <ellipse cx="218" cy="220" rx="20" ry="11" fill="#FDE68A" transform="rotate(12 218 220)"/>
  <!-- egg -->
  <ellipse cx="200" cy="190" rx="32" ry="25" fill="#FEF3C7"/>
  <circle cx="200" cy="190" r="14" fill="#F97316"/>
  <!-- green onion -->
  <rect x="155" y="165" width="5" height="35" rx="2" fill="#22C55E" transform="rotate(-20 155 165)"/>
  <rect x="240" y="170" width="5" height="30" rx="2" fill="#22C55E" transform="rotate(15 240 170)"/>
  <!-- shrimp -->
  <path d="M150 200 Q140 185 155 175 Q165 168 170 180 Q175 192 165 198 Z" fill="#FDA4AF"/>
  <path d="M248 202 Q258 187 243 177 Q233 170 228 182 Q223 194 233 200 Z" fill="#FDA4AF"/>
  <!-- chili -->
  <path d="M175 155 Q178 140 185 138 Q188 150 182 158 Z" fill="#EF4444"/>
  <path d="M220 158 Q225 143 218 140 Q215 152 221 160 Z" fill="#EF4444"/>
  <!-- shadow -->
  <ellipse cx="200" cy="342" rx="120" ry="12" fill="#00000015"/>
  <!-- label -->
  <text x="200" y="375" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" font-weight="bold" fill="#374151">Nasi Goreng Spesial</text>
</svg>`,
  },
  {
    sku: 'PRD-002',
    name: 'Mie Goreng Seafood',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <rect width="400" height="400" fill="white"/>
  <ellipse cx="200" cy="240" rx="155" ry="30" fill="#e8e0d5"/>
  <ellipse cx="200" cy="230" rx="150" ry="110" fill="#f5f0e8"/>
  <!-- noodles -->
  <path d="M100 210 Q130 190 160 210 Q190 230 220 210 Q250 190 280 210 Q300 220 290 235" stroke="#F59E0B" stroke-width="7" fill="none" stroke-linecap="round"/>
  <path d="M110 225 Q140 205 170 225 Q200 245 230 225 Q260 205 285 225" stroke="#FDE68A" stroke-width="6" fill="none" stroke-linecap="round"/>
  <path d="M105 240 Q135 220 165 240 Q195 260 225 240 Q255 220 280 240" stroke="#F59E0B" stroke-width="6" fill="none" stroke-linecap="round"/>
  <path d="M115 255 Q145 235 175 255 Q205 275 235 255 Q265 235 285 255" stroke="#FDE68A" stroke-width="5" fill="none" stroke-linecap="round"/>
  <!-- shrimp -->
  <path d="M145 195 Q130 175 148 162 Q165 155 170 170 Q175 185 162 195 Z" fill="#FDA4AF"/>
  <path d="M248 198 Q263 178 245 165 Q228 158 223 173 Q218 188 231 198 Z" fill="#FDA4AF"/>
  <!-- squid rings -->
  <ellipse cx="200" cy="195" rx="20" ry="14" fill="none" stroke="#F8FAFC" stroke-width="6"/>
  <ellipse cx="200" cy="195" rx="20" ry="14" fill="none" stroke="#E2E8F0" stroke-width="3"/>
  <!-- green veg -->
  <ellipse cx="165" cy="230" rx="12" ry="8" fill="#22C55E" transform="rotate(-20 165 230)"/>
  <ellipse cx="235" cy="228" rx="12" ry="8" fill="#16A34A" transform="rotate(15 235 228)"/>
  <!-- chili -->
  <path d="M185 168 Q188 153 196 151 Q199 163 193 172 Z" fill="#EF4444"/>
  <ellipse cx="200" cy="342" rx="120" ry="12" fill="#00000015"/>
  <text x="200" y="375" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" font-weight="bold" fill="#374151">Mie Goreng Seafood</text>
</svg>`,
  },
  {
    sku: 'PRD-003',
    name: 'Ayam Goreng Kremes',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <rect width="400" height="400" fill="white"/>
  <ellipse cx="200" cy="240" rx="155" ry="30" fill="#e8e0d5"/>
  <ellipse cx="200" cy="230" rx="150" ry="110" fill="#f5f0e8"/>
  <!-- chicken drumstick -->
  <path d="M170 155 Q185 130 215 130 Q250 130 265 160 Q278 190 260 220 Q240 248 210 250 Q180 252 162 230 Q148 210 150 185 Z" fill="#D97706"/>
  <path d="M175 162 Q190 140 215 138 Q245 140 258 168 Q268 192 252 218 Q234 242 208 244 Q182 246 166 226 Q154 208 156 186 Z" fill="#F59E0B"/>
  <!-- crispy texture -->
  <circle cx="195" cy="175" r="8" fill="#D97706" opacity="0.7"/>
  <circle cx="220" cy="168" r="6" fill="#B45309" opacity="0.8"/>
  <circle cx="240" cy="185" r="9" fill="#D97706" opacity="0.7"/>
  <circle cx="208" cy="200" r="7" fill="#B45309" opacity="0.8"/>
  <circle cx="232" cy="210" r="8" fill="#D97706" opacity="0.7"/>
  <circle cx="178" cy="200" r="6" fill="#B45309" opacity="0.8"/>
  <!-- bone -->
  <rect x="185" y="240" width="30" height="55" rx="8" fill="#F9FAFB"/>
  <circle cx="200" cy="240" r="14" fill="#F3F4F6"/>
  <circle cx="200" cy="295" r="14" fill="#F3F4F6"/>
  <!-- kremes (crispy bits) -->
  <circle cx="155" cy="245" r="7" fill="#F59E0B"/>
  <circle cx="168" cy="255" r="5" fill="#D97706"/>
  <circle cx="245" cy="247" r="7" fill="#F59E0B"/>
  <circle cx="233" cy="258" r="5" fill="#D97706"/>
  <!-- garnish -->
  <ellipse cx="148" cy="230" rx="18" ry="10" fill="#4ADE80" transform="rotate(-20 148 230)"/>
  <ellipse cx="252" cy="233" rx="18" ry="10" fill="#4ADE80" transform="rotate(20 252 233)"/>
  <ellipse cx="200" cy="342" rx="120" ry="12" fill="#00000015"/>
  <text x="200" y="375" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" font-weight="bold" fill="#374151">Ayam Goreng Kremes</text>
</svg>`,
  },
  {
    sku: 'PRD-004',
    name: 'Es Kopi Susu',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <rect width="400" height="400" fill="white"/>
  <!-- glass shadow -->
  <ellipse cx="200" cy="348" rx="70" ry="12" fill="#00000015"/>
  <!-- glass body -->
  <path d="M148 100 L152 320 Q152 335 200 335 Q248 335 248 320 L252 100 Z" fill="#E0F2FE" opacity="0.5"/>
  <path d="M150 100 L154 318 Q154 332 200 332 Q246 332 246 318 L250 100 Z" fill="none" stroke="#BAE6FD" stroke-width="3"/>
  <!-- coffee layers -->
  <!-- ice -->
  <rect x="162" y="240" width="35" height="40" rx="6" fill="white" opacity="0.8"/>
  <rect x="202" y="255" width="30" height="45" rx="6" fill="white" opacity="0.7"/>
  <rect x="175" y="270" width="28" height="38" rx="6" fill="white" opacity="0.75"/>
  <!-- espresso layer -->
  <path d="M154 280 L246 280 L246 318 Q246 330 200 330 Q154 330 154 318 Z" fill="#78350F"/>
  <!-- milk layer -->
  <path d="M154 220 L246 220 L246 280 L154 280 Z" fill="#FDE8C8"/>
  <!-- coffee top -->
  <path d="M154 155 L246 155 L246 220 L154 220 Z" fill="#92400E"/>
  <!-- foam top -->
  <path d="M154 100 L246 100 L246 155 L154 155 Z" fill="#FEF3C7"/>
  <!-- bubbles in foam -->
  <circle cx="175" cy="128" r="8" fill="white" opacity="0.6"/>
  <circle cx="200" cy="122" r="10" fill="white" opacity="0.5"/>
  <circle cx="225" cy="130" r="7" fill="white" opacity="0.6"/>
  <!-- straw -->
  <rect x="225" y="70" width="10" height="220" rx="5" fill="#F9A8D4"/>
  <rect x="226" y="71" width="4" height="218" rx="3" fill="#FBCFE8"/>
  <!-- glass top rim -->
  <ellipse cx="200" cy="100" rx="52" ry="12" fill="#BAE6FD" opacity="0.6"/>
  <!-- condensation drops -->
  <path d="M155 180 Q152 190 155 195" stroke="#BAE6FD" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M245 210 Q248 220 245 226" stroke="#BAE6FD" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M152 240 Q149 252 152 258" stroke="#BAE6FD" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <text x="200" y="378" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" font-weight="bold" fill="#374151">Es Kopi Susu</text>
</svg>`,
  },
  {
    sku: 'PRD-005',
    name: 'Matcha Latte',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <rect width="400" height="400" fill="white"/>
  <ellipse cx="200" cy="348" rx="70" ry="12" fill="#00000015"/>
  <!-- glass -->
  <path d="M148 100 L152 320 Q152 335 200 335 Q248 335 248 320 L252 100 Z" fill="#D1FAE5" opacity="0.4"/>
  <path d="M150 100 L154 318 Q154 332 200 332 Q246 332 246 318 L250 100 Z" fill="none" stroke="#A7F3D0" stroke-width="3"/>
  <!-- layers -->
  <path d="M154 280 L246 280 L246 318 Q246 330 200 330 Q154 330 154 318 Z" fill="#F5F5F4"/>
  <!-- matcha layer -->
  <path d="M154 140 L246 140 L246 280 L154 280 Z" fill="#86EFAC"/>
  <!-- matcha dark -->
  <path d="M154 100 L246 100 L246 155 L154 155 Z" fill="#4ADE80"/>
  <!-- milk foam -->
  <ellipse cx="200" cy="100" rx="52" ry="14" fill="#FEF3C7"/>
  <!-- latte art -->
  <path d="M178 100 Q188 92 200 100 Q212 108 222 100" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M182 106 Q191 98 200 106 Q209 114 218 106" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/>
  <!-- ice cubes -->
  <rect x="160" y="210" width="32" height="36" rx="5" fill="white" opacity="0.6"/>
  <rect x="208" y="225" width="28" height="32" rx="5" fill="white" opacity="0.55"/>
  <!-- straw -->
  <rect x="224" y="65" width="10" height="225" rx="5" fill="#BEF264"/>
  <rect x="225" y="66" width="4" height="223" rx="3" fill="#D9F99D"/>
  <!-- condensation -->
  <path d="M155 200 Q152 210 155 215" stroke="#A7F3D0" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M245 230 Q248 240 245 246" stroke="#A7F3D0" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <text x="200" y="378" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" font-weight="bold" fill="#374151">Matcha Latte</text>
</svg>`,
  },
  {
    sku: 'PRD-006',
    name: 'Smoothie Buah Segar',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <rect width="400" height="400" fill="white"/>
  <ellipse cx="200" cy="348" rx="70" ry="12" fill="#00000015"/>
  <!-- cup body -->
  <path d="M155 90 L160 315 Q160 332 200 332 Q240 332 240 315 L245 90 Z" fill="#FEE2E2" opacity="0.6"/>
  <path d="M157 92 L162 313 Q162 330 200 330 Q238 330 238 313 L243 92 Z" fill="none" stroke="#FCA5A5" stroke-width="3"/>
  <!-- smoothie gradient -->
  <path d="M162 115 L238 115 L238 313 Q238 328 200 328 Q162 328 162 313 Z" fill="#FB923C"/>
  <path d="M162 115 L238 115 L238 200 L162 200 Z" fill="#F97316"/>
  <!-- fruit pieces floating -->
  <ellipse cx="178" cy="155" rx="14" ry="10" fill="#EF4444" transform="rotate(-15 178 155)"/>
  <ellipse cx="218" cy="175" rx="12" ry="9" fill="#F97316" transform="rotate(20 218 175)"/>
  <ellipse cx="192" cy="200" rx="16" ry="11" fill="#FCD34D" transform="rotate(-10 192 200)"/>
  <ellipse cx="228" cy="145" rx="10" ry="7" fill="#EF4444" transform="rotate(25 228 145)"/>
  <!-- strawberry -->
  <path d="M172 130 Q165 115 175 108 Q185 105 190 118 Q192 130 182 135 Z" fill="#EF4444"/>
  <path d="M175 108 Q182 100 188 108" stroke="#22C55E" stroke-width="3" fill="none"/>
  <!-- foam top -->
  <path d="M162 115 Q175 100 200 108 Q225 100 238 115" fill="#FEF3C7" stroke="#FDE68A" stroke-width="1"/>
  <!-- cup top rim -->
  <ellipse cx="200" cy="92" rx="44" ry="10" fill="#FCA5A5" opacity="0.7"/>
  <!-- straw -->
  <rect x="215" y="55" width="10" height="230" rx="5" fill="#C084FC"/>
  <rect x="216" y="56" width="4" height="228" rx="3" fill="#E9D5FF"/>
  <!-- umbrella pick -->
  <line x1="172" y1="82" x2="172" y2="115" stroke="#92400E" stroke-width="2"/>
  <path d="M155 82 Q172 65 189 82 Z" fill="#EF4444" opacity="0.8"/>
  <path d="M155 82 Q172 72 189 82" stroke="white" stroke-width="1.5" fill="none"/>
  <text x="200" y="375" text-anchor="middle" font-family="Arial,sans-serif" font-size="20" font-weight="bold" fill="#374151">Smoothie Buah Segar</text>
</svg>`,
  },
  {
    sku: 'PRD-007',
    name: 'Cheesecake Slice',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <rect width="400" height="400" fill="white"/>
  <ellipse cx="200" cy="342" rx="130" ry="14" fill="#00000015"/>
  <!-- plate -->
  <ellipse cx="200" cy="320" rx="140" ry="22" fill="#F8FAFC"/>
  <ellipse cx="200" cy="316" rx="135" ry="18" fill="none" stroke="#E2E8F0" stroke-width="2"/>
  <!-- slice base (crust) -->
  <path d="M100 290 L200 145 L300 290 Z" fill="#D97706"/>
  <path d="M108 290 L200 155 L292 290 Z" fill="#B45309"/>
  <!-- cheesecake body -->
  <path d="M108 280 L200 152 L292 280 Z" fill="#FEF9C3"/>
  <!-- cream layer -->
  <path d="M114 275 L200 158 L286 275 Z" fill="#FEFCE8"/>
  <!-- strawberry topping -->
  <circle cx="200" cy="175" r="28" fill="#FEF3C7" opacity="0.5"/>
  <!-- strawberry sauce drip -->
  <path d="M185 165 Q183 178 188 185 Q190 190 186 200" stroke="#EF4444" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M210 168 Q214 180 210 188 Q208 195 212 205" stroke="#EF4444" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  <!-- strawberry -->
  <path d="M192 148 Q185 130 196 124 Q208 120 215 132 Q218 148 205 155 Z" fill="#EF4444"/>
  <path d="M196 124 Q204 113 212 124" stroke="#22C55E" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  <!-- seeds on strawberry -->
  <ellipse cx="198" cy="135" rx="2" ry="3" fill="#FCA5A5" transform="rotate(-10 198 135)"/>
  <ellipse cx="208" cy="133" rx="2" ry="3" fill="#FCA5A5" transform="rotate(15 208 133)"/>
  <ellipse cx="203" cy="146" rx="2" ry="3" fill="#FCA5A5"/>
  <!-- whipped cream -->
  <path d="M172 228 Q178 210 190 218 Q196 200 208 210 Q218 195 228 218 Q238 210 242 228" fill="#FFFBEB" stroke="#FDE68A" stroke-width="2"/>
  <!-- mint leaf -->
  <path d="M244 218 Q258 208 260 222 Q250 230 244 218 Z" fill="#4ADE80"/>
  <text x="200" y="375" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" font-weight="bold" fill="#374151">Cheesecake Slice</text>
</svg>`,
  },
  {
    sku: 'PRD-008',
    name: 'Brownies Coklat Leleh',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <rect width="400" height="400" fill="white"/>
  <ellipse cx="200" cy="342" rx="125" ry="14" fill="#00000015"/>
  <!-- plate -->
  <ellipse cx="200" cy="318" rx="135" ry="20" fill="#F8FAFC"/>
  <!-- brownie block -->
  <!-- shadow side -->
  <path d="M120 295 L120 220 L135 210 L280 210 L280 295 Z" fill="#451A03"/>
  <!-- top face -->
  <rect x="120" y="175" width="160" height="118" rx="8" fill="#78350F"/>
  <!-- chocolate texture -->
  <rect x="125" y="180" width="73" height="55" rx="4" fill="#92400E" opacity="0.7"/>
  <rect x="202" y="180" width="73" height="55" rx="4" fill="#92400E" opacity="0.7"/>
  <rect x="125" y="239" width="73" height="50" rx="4" fill="#92400E" opacity="0.7"/>
  <rect x="202" y="239" width="73" height="50" rx="4" fill="#92400E" opacity="0.7"/>
  <!-- crack lines -->
  <line x1="200" y1="175" x2="200" y2="293" stroke="#451A03" stroke-width="3"/>
  <line x1="120" y1="238" x2="280" y2="238" stroke="#451A03" stroke-width="3"/>
  <!-- chocolate drizzle -->
  <path d="M148 175 Q145 158 155 152 Q163 148 165 158 Q167 168 160 175" fill="#7C2D12"/>
  <path d="M195 175 Q192 152 202 148 Q210 144 213 155 Q215 168 207 175" fill="#7C2D12"/>
  <path d="M240 175 Q242 155 252 152 Q260 150 258 162 Q256 173 248 175" fill="#7C2D12"/>
  <!-- chocolate pool on top -->
  <ellipse cx="163" cy="200" rx="22" ry="14" fill="#3D1405" opacity="0.6"/>
  <ellipse cx="237" cy="205" rx="20" ry="12" fill="#3D1405" opacity="0.6"/>
  <ellipse cx="200" cy="258" rx="24" ry="14" fill="#3D1405" opacity="0.6"/>
  <!-- walnut pieces -->
  <ellipse cx="152" cy="252" rx="10" ry="7" fill="#A16207" transform="rotate(-15 152 252)"/>
  <ellipse cx="248" cy="248" rx="10" ry="7" fill="#A16207" transform="rotate(20 248 248)"/>
  <!-- powdered sugar on edge -->
  <path d="M120 175 Q130 168 140 175" stroke="white" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.7"/>
  <path d="M260 175 Q270 168 280 175" stroke="white" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.7"/>
  <text x="200" y="375" text-anchor="middle" font-family="Arial,sans-serif" font-size="20" font-weight="bold" fill="#374151">Brownies Coklat Leleh</text>
</svg>`,
  },
  {
    sku: 'PRD-009',
    name: 'French Fries Crispy',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <rect width="400" height="400" fill="white"/>
  <ellipse cx="200" cy="342" rx="100" ry="12" fill="#00000015"/>
  <!-- fries container -->
  <path d="M150 230 L155 320 Q155 332 200 332 Q245 332 245 320 L250 230 Z" fill="#EF4444"/>
  <path d="M148 220 L252 220 L250 230 L150 230 Z" fill="#DC2626"/>
  <!-- container fold lines -->
  <line x1="200" y1="220" x2="200" y2="332" stroke="#B91C1C" stroke-width="2" opacity="0.5"/>
  <!-- arch logo area -->
  <path d="M172 265 Q172 255 185 255 Q200 255 200 265 Q200 255 215 255 Q228 255 228 265" stroke="#FDE68A" stroke-width="3" fill="none" stroke-linecap="round"/>
  <!-- french fries sticking up -->
  <!-- fry 1 -->
  <rect x="163" y="110" width="12" height="118" rx="4" fill="#F59E0B"/>
  <rect x="164" y="111" width="5" height="116" rx="3" fill="#FDE68A" opacity="0.7"/>
  <!-- fry 2 -->
  <rect x="180" y="95" width="12" height="133" rx="4" fill="#D97706"/>
  <rect x="181" y="96" width="5" height="131" rx="3" fill="#F59E0B" opacity="0.7"/>
  <!-- fry 3 -->
  <rect x="197" y="88" width="12" height="140" rx="4" fill="#F59E0B"/>
  <rect x="198" y="89" width="5" height="138" rx="3" fill="#FDE68A" opacity="0.7"/>
  <!-- fry 4 -->
  <rect x="214" y="98" width="12" height="130" rx="4" fill="#D97706"/>
  <rect x="215" y="99" width="5" height="128" rx="3" fill="#F59E0B" opacity="0.7"/>
  <!-- fry 5 -->
  <rect x="231" y="108" width="12" height="120" rx="4" fill="#F59E0B"/>
  <rect x="232" y="109" width="5" height="118" rx="3" fill="#FDE68A" opacity="0.7"/>
  <!-- behind fries -->
  <rect x="172" y="120" width="10" height="108" rx="4" fill="#B45309"/>
  <rect x="222" y="115" width="10" height="113" rx="4" fill="#B45309"/>
  <!-- salt dots -->
  <circle cx="185" cy="145" r="2.5" fill="white" opacity="0.8"/>
  <circle cx="205" cy="130" r="2.5" fill="white" opacity="0.8"/>
  <circle cx="220" cy="155" r="2.5" fill="white" opacity="0.8"/>
  <circle cx="195" cy="165" r="2.5" fill="white" opacity="0.8"/>
  <!-- ketchup dip -->
  <ellipse cx="132" cy="298" rx="28" ry="18" fill="#EF4444"/>
  <ellipse cx="132" cy="294" rx="24" ry="14" fill="#FCA5A5"/>
  <text x="200" y="375" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" font-weight="bold" fill="#374151">French Fries Crispy</text>
</svg>`,
  },
  {
    sku: 'PRD-010',
    name: 'Paket Hemat',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <rect width="400" height="400" fill="white"/>
  <ellipse cx="200" cy="345" rx="155" ry="14" fill="#00000015"/>
  <!-- plate -->
  <ellipse cx="175" cy="308" rx="100" ry="16" fill="#F0F0F0"/>
  <!-- rice portion (small) -->
  <ellipse cx="175" cy="295" rx="82" ry="60" fill="#FDE68A"/>
  <ellipse cx="175" cy="282" rx="65" ry="45" fill="#F59E0B"/>
  <!-- egg on rice -->
  <ellipse cx="175" cy="272" rx="22" ry="17" fill="#FEF3C7"/>
  <circle cx="175" cy="272" r="10" fill="#F97316"/>
  <!-- green onion on rice -->
  <rect x="155" y="258" width="4" height="22" rx="2" fill="#22C55E" transform="rotate(-15 155 258)"/>
  <rect x="195" y="260" width="4" height="20" rx="2" fill="#22C55E" transform="rotate(15 195 260)"/>
  <!-- drink glass -->
  <path d="M278 145 L282 295 Q282 308 310 308 Q338 308 338 295 L342 145 Z" fill="#E0F2FE" opacity="0.5"/>
  <path d="M280 147 L284 293 Q284 306 310 306 Q336 306 336 293 L340 147 Z" fill="none" stroke="#BAE6FD" stroke-width="2.5"/>
  <!-- drink content -->
  <path d="M284 170 L336 170 L336 293 Q336 304 310 304 Q284 304 284 293 Z" fill="#7DD3FC"/>
  <path d="M284 147 L336 147 L336 175 L284 175 Z" fill="#FEF9C3"/>
  <!-- ice in drink -->
  <rect x="290" y="210" width="20" height="28" rx="4" fill="white" opacity="0.6"/>
  <rect x="318" y="220" width="15" height="24" rx="4" fill="white" opacity="0.55"/>
  <!-- drink straw -->
  <rect x="328" y="112" width="7" height="160" rx="3" fill="#F9A8D4"/>
  <!-- drink rim -->
  <ellipse cx="310" cy="147" rx="30" ry="8" fill="#BAE6FD" opacity="0.7"/>
  <!-- label badge -->
  <circle cx="310" cy="70" r="42" fill="#FEF08A"/>
  <circle cx="310" cy="70" r="38" fill="#FDE047"/>
  <text x="310" y="62" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" font-weight="bold" fill="#713F12">PAKET</text>
  <text x="310" y="78" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" font-weight="bold" fill="#713F12">HEMAT</text>
  <text x="310" y="95" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" fill="#92400E">55K</text>
  <!-- plus sign between -->
  <text x="255" y="235" text-anchor="middle" font-family="Arial,sans-serif" font-size="36" font-weight="bold" fill="#D1D5DB">+</text>
  <text x="200" y="378" text-anchor="middle" font-family="Arial,sans-serif" font-size="20" font-weight="bold" fill="#374151">Paket Hemat (Nasi+Minum)</text>
</svg>`,
  },
];

// ─── Upload & Update ─────────────────────────────────────────────────────────
async function main() {
  console.log('🍽️  Upload POS Product Images');
  console.log('================================');

  for (const product of PRODUCTS) {
    const filename = `pos/${product.sku.toLowerCase()}.svg`;
    const svgBuffer = Buffer.from(product.svg);

    // Upload to Supabase Storage
    const { error: uploadError } = await sb.storage
      .from('products')
      .upload(filename, svgBuffer, {
        contentType: 'image/svg+xml',
        upsert: true,
      });

    if (uploadError) {
      console.error(`  ✗ upload ${product.sku}: ${uploadError.message}`);
      continue;
    }

    // Get public URL
    const { data: { publicUrl } } = sb.storage
      .from('products')
      .getPublicUrl(filename);

    // Update pos_products
    const { error: updateError } = await sb
      .from('pos_products')
      .update({ image_url: publicUrl })
      .eq('sku', product.sku);

    if (updateError) {
      console.error(`  ✗ update ${product.sku}: ${updateError.message}`);
    } else {
      console.log(`  ✓ ${product.sku} — ${product.name}`);
    }
  }

  console.log('\n✅ Selesai! Semua gambar produk telah diupload.');
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
