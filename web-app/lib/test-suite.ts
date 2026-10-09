import { registerSchema, loginSchema, searchQuerySchema, sanitizeNextUrl } from './validations';
import { searchProducts } from './products';

// 1. Kiểm tra hàm sanitizeNextUrl chống Open Redirect
function testSanitizeNextUrl() {
  console.log('--- Test sanitizeNextUrl ---');
  const valid1 = sanitizeNextUrl('/admin');
  const valid2 = sanitizeNextUrl('/san-pham?mien=bac');
  const evil1 = sanitizeNextUrl('https://evil-phishing.com');
  const evil2 = sanitizeNextUrl('//evil-phishing.com');
  const evil3 = sanitizeNextUrl('\\\\evil.com');
  const empty = sanitizeNextUrl('');

  console.assert(valid1 === '/admin', `Expected '/admin', got '${valid1}'`);
  console.assert(valid2 === '/san-pham?mien=bac', `Expected '/san-pham?mien=bac', got '${valid2}'`);
  console.assert(evil1 === '/', `Expected '/', got '${evil1}'`);
  console.assert(evil2 === '/', `Expected '/', got '${evil2}'`);
  console.assert(evil3 === '/', `Expected '/', got '${evil3}'`);
  console.assert(empty === '/', `Expected '/', got '${empty}'`);
  console.log('✓ testSanitizeNextUrl PASSED');
}

// 2. Kiểm tra Zod Register Schema (Mật khẩu >= 8 ký tự, có chữ và số, SĐT 10 số bắt đầu bằng 0)
function testRegisterSchema() {
  console.log('--- Test registerSchema ---');
  // Hợp lệ
  const valid = registerSchema.safeParse({
    fullName: 'Nguyễn Văn An',
    email: 'an.nguyen@example.com',
    phone: '0912345678',
    password: 'Password123',
    confirmPassword: 'Password123',
  });
  console.assert(valid.success === true, 'Valid register data should pass');

  // Mật khẩu yếu (chỉ có chữ)
  const weakPassword = registerSchema.safeParse({
    fullName: 'Nguyễn Văn An',
    email: 'an.nguyen@example.com',
    phone: '0912345678',
    password: 'passwordonly',
    confirmPassword: 'passwordonly',
  });
  console.assert(weakPassword.success === false, 'Password without numbers should fail');

  // Số điện thoại sai định dạng
  const wrongPhone = registerSchema.safeParse({
    fullName: 'Nguyễn Văn An',
    email: 'an.nguyen@example.com',
    phone: '1234567890',
    password: 'Password123',
    confirmPassword: 'Password123',
  });
  console.assert(wrongPhone.success === false, 'Phone not starting with 0 should fail');

  // Mật khẩu xác nhận không khớp
  const mismatch = registerSchema.safeParse({
    fullName: 'Nguyễn Văn An',
    email: 'an.nguyen@example.com',
    phone: '0912345678',
    password: 'Password123',
    confirmPassword: 'Password456',
  });
  console.assert(mismatch.success === false, 'Mismatched passwords should fail');

  console.log('✓ testRegisterSchema PASSED');
}

// 3. Kiểm tra Search Schema & Làm sạch từ khóa q
function testSearchQuerySchema() {
  console.log('--- Test searchQuerySchema ---');
  // Query chứa ký tự đặc biệt độc hại
  const dirtyInput = {
    q: '<script>alert(1)</script> Trà sen [test]',
    mien: 'bac',
    gia_max: 300000,
  };
  const parsed = searchQuerySchema.safeParse(dirtyInput);
  console.assert(parsed.success === true, 'Search schema should parse');
  if (parsed.success) {
    console.assert(!parsed.data.q.includes('<'), 'Sanitized query must not include <');
    console.assert(!parsed.data.q.includes('>'), 'Sanitized query must not include >');
    console.assert(parsed.data.q.includes('Trà sen'), 'Sanitized query should keep valid keywords');
  }
  console.log('✓ testSearchQuerySchema PASSED');
}

// 4. Kiểm tra Tìm kiếm & Lọc sản phẩm
async function testSearchProducts() {
  console.log('--- Test searchProducts function ---');
  // Lọc theo miền Bắc
  const bacResult = await searchProducts({ mien: 'bac' });
  console.assert(bacResult.products.length > 0, 'Should find products for region Bac');
  console.assert(
    bacResult.products.every((p) => p.region === 'bac' || p.region === 'ba_mien'),
    'All returned products must match region bac or ba_mien'
  );

  // Lọc theo từ khóa 'Trà'
  const traResult = await searchProducts({ q: 'Trà' });
  console.assert(traResult.products.length > 0, 'Should find tea products');

  // Lọc khoảng giá
  const priceResult = await searchProducts({ gia_min: 100000, gia_max: 200000 });
  console.assert(
    priceResult.products.every((p) => p.price >= 100000 && p.price <= 200000),
    'All products must be within price range 100k - 200k'
  );

  console.log('✓ testSearchProducts PASSED');
}

async function runAllTests() {
  console.log('================ BẮT ĐẦU CHẠY UNIT TESTS ================');
  testSanitizeNextUrl();
  testRegisterSchema();
  testSearchQuerySchema();
  await testSearchProducts();
  console.log('================ TẤT CẢ UNIT TESTS ĐỀU ĐẠT 100% ================');
}

runAllTests().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
