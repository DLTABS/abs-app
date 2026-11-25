// Thông tin thương hiệu dùng chung cho các phần sinh file (PDF tờ khai, bản gửi khách của
// Soát xét báo cáo...). Đặt tập trung ở đây để lần sau đổi tên/thông tin chỉ sửa một chỗ.
//
// Lưu ý: thông tin pháp lý/ngân hàng in trên HỢP ĐỒNG dịch vụ và phiếu ĐNTT hiện vẫn nằm riêng
// trong app/api/admin/contract/route.js và app/api/admin/dntt/route.js (số tài khoản trong mã QR)
// — đổi thông tin công ty thì phải sửa cả ba chỗ.
export const THUONG_HIEU = {
  ten: 'Đại lý thuế ABS',            // tên ngắn, dùng trong câu chữ
  tenMenu: 'ABS',                    // dòng chữ trên đầu menu trái
  moTa: 'Hệ thống quản lý nội bộ',   // dòng nhỏ dưới tên
  logo: '/logo-abs.png',
  tenMien: 'app.dailythueabs.vn',
  tienToBieuMau: 'ABS',              // tiền tố mã biểu mẫu ISO (ABS.MB13...)

  phapLy: {
    tenDayDu: 'CÔNG TY TNHH ĐÀO TẠO VÀ DỊCH VỤ ABS GROUP',
    tenNgan: 'ABS GROUP',
    linhVuc: 'ĐẠI LÝ THUẾ – THÀNH LẬP DOANH NGHIỆP',
    mst: '2300 856 966',
    diaChi: 'Số 05, Hoàng Văn Thái, Võ Cường, Tỉnh Bắc Ninh, Việt Nam',
    hotline: '0962.511.222',
    website: 'dailythueabs.vn',
    nguoiDaiDien: 'Bà HOÀNG THỊ HƯƠNG',
    chucVu: 'Giám đốc',
    nganHang: 'Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)',
    soTaiKhoan: '0351001043923',
    chuTaiKhoan: 'ABS GROUP',
  },
}
