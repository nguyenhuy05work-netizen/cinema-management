
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { bookingApi } from '../api/bookingApi';
import './TicketPage.css';

const formatMoney = (amount) =>
  Number(amount || 0).toLocaleString('vi-VN') + ' đ';

const formatDate = (value) => {
  if (!value) return 'Chưa có thông tin';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Chưa có thông tin';
  }

  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export default function TicketPage() {
  const { id } = useParams();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const fetchTicket = async () => {
      try {
        setLoading(true);
        setError('');
        setBooking(null);

        const data = await bookingApi.getById(id);

        if (active) {
          setBooking(data);
        }
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
              'Không thể tải thông tin vé.'
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchTicket();

    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <main className="ticket-page">
        <p>Đang tải vé xem phim...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="ticket-page">
        <h2>Không thể hiển thị vé</h2>
        <p className="form-error">{error}</p>
        <Link to="/bookings">Quay lại đơn đặt vé</Link>
      </main>
    );
  }

  if (!booking || booking.status !== 'PAID') {
    return (
      <main className="ticket-page">
        <h2>Vé chưa sẵn sàng</h2>
        <p>
          Đơn đặt vé chưa được xác nhận thanh toán
          hoặc không còn hiệu lực.
        </p>
        <Link to={`/checkout/${id}`}>
          Xem trạng thái thanh toán
        </Link>
      </main>
    );
  }

  return (
    <main className="ticket-page">
      <header className="ticket-heading">
        <div className="ticket-success-icon">✓</div>
        <p className="ticket-eyebrow">CINEMA E-TICKET</p>
        <h1>Vé xem phim của bạn</h1>
        <p>
          Thanh toán thành công · Đơn BK-{booking.id}
        </p>
      </header>

      <div className="ticket-list">
        {booking.seats?.map((seat) => (
          <article
            className="cinema-ticket"
            key={seat.seatId}
          >
            <div className="ticket-main">
              <div className="ticket-top">
                <span className="ticket-brand">
                  ★ CINEMA
                </span>

                <span className="ticket-status">
                  ✓ ĐÃ THANH TOÁN
                </span>
              </div>

              <div className="ticket-content">
                <div className="ticket-details">
                  <p className="ticket-label">
                    VÉ XEM PHIM
                  </p>

                  <h2>{booking.movieTitle}</h2>

                  <div className="ticket-info">
                    <div>
                      <span>Suất chiếu</span>
                      <strong>
                        {formatDate(booking.startTime)}
                      </strong>
                    </div>

                    <div>
                      <span>Phòng chiếu</span>
                      <strong>{booking.hallName}</strong>
                    </div>

                    <div>
                      <span>Số ghế</span>
                      <strong className="ticket-seat">
                        {seat.seatNumber}
                      </strong>
                    </div>

                    <div>
                      <span>Giá vé</span>
                      <strong>
                        {formatMoney(seat.price)}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="ticket-qr-panel">
                  {seat.ticketCode ? (
                    <div className="ticket-qr">
                      <QRCodeSVG
                        value={seat.ticketCode}
                        size={150}
                        level="H"
                        marginSize={2}
                        bgColor="#ffffff"
                        fgColor="#111111"
                      />
                    </div>
                  ) : (
                    <p>Chưa có mã QR</p>
                  )}

                  <span>QUÉT MÃ ĐỂ CHECK-IN</span>
                  <small>Xuất trình tại quầy soát vé</small>
                </div>
              </div>
            </div>

            <div className="ticket-bottom">
              <div className="ticket-code">
                <span>MÃ VÉ</span>
                <strong>
                  {seat.ticketCode || 'Chưa có mã vé'}
                </strong>
              </div>

              <div className="ticket-order">
                <span>MÃ ĐƠN</span>
                <strong>BK-{booking.id}</strong>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="ticket-summary">
        <span>Tổng thanh toán</span>
        <strong>{formatMoney(booking.totalAmount)}</strong>
      </div>

      <p className="ticket-note">
        Vui lòng xuất trình mã QR khi đến rạp.
        Mỗi ghế có một mã vé riêng.
      </p>

      <div className="ticket-actions">
        <Link to="/bookings" className="ticket-action">
          Đơn đặt vé của tôi
        </Link>

        <Link to="/" className="ticket-action secondary">
          Về trang chủ
        </Link>
      </div>
    </main>
  );
}
