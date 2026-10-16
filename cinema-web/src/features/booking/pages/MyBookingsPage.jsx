
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { bookingApi } from '../api/bookingApi';

const statusLabels = {
  PENDING: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  EXPIRED: 'Đã hết hạn',
  CANCELLED: 'Đã hủy',
};

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

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const fetchBookings = async () => {
      try {
        setLoading(true);
        setError('');

        const data = await bookingApi.getMine();

        if (active) {
          setBookings(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
              'Không thể tải lịch sử đặt vé.'
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchBookings();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="page-shell">
      <div className="section-heading">
        <div>
          <p className="eyebrow">LỊCH SỬ ĐẶT VÉ</p>
          <h1>Đơn đặt vé của tôi</h1>
          <p>
            Theo dõi trạng thái thanh toán và xem vé
            xem phim của bạn.
          </p>
        </div>
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {loading && <p>Đang tải lịch sử đặt vé...</p>}

      {!loading &&
        !error &&
        bookings?.length === 0 && (
          <div className="admin-form">
            <h2>Bạn chưa có đơn đặt vé</h2>
            <p>
              Hãy chọn một bộ phim và suất chiếu yêu thích
              để bắt đầu đặt vé.
            </p>

            <Link className="primary-button" to="/">
              Khám phá phim
            </Link>
          </div>
        )}

      {!loading &&
        bookings?.map((booking) => {
          const status = booking.status;

          const seatNumbers = booking.seats
            ?.map((seat) => seat.seatNumber)
            .filter(Boolean)
            .join(', ');

          const isPaid = status === 'PAID';
          const isPending = status === 'PENDING';

          return (
            <article
              className="notification-item"
              key={booking.id}
              style={{
                marginBottom: '18px',
                padding: '22px',
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                    marginBottom: '12px',
                  }}
                >
                  <strong style={{ fontSize: '20px' }}>
                    {booking.movieTitle}
                  </strong>

                  <span
                    style={{
                      padding: '5px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '700',
                      background: isPaid
                        ? 'rgba(34,197,94,0.12)'
                        : isPending
                          ? 'rgba(234,179,8,0.12)'
                          : 'rgba(148,163,184,0.12)',
                      color: isPaid
                        ? '#22c55e'
                        : isPending
                          ? '#eab308'
                          : '#94a3b8',
                    }}
                  >
                    {statusLabels[status] || status}
                  </span>
                </div>

                <p>
                  <strong>Mã đơn:</strong> BK-{booking.id}
                </p>

                <p>
                  <strong>Suất chiếu:</strong>{' '}
                  {formatDate(booking.startTime)}
                </p>

                <p>
                  <strong>Phòng chiếu:</strong>{' '}
                  {booking.hallName || 'Chưa có thông tin'}
                </p>

                {seatNumbers && (
                  <p>
                    <strong>Ghế:</strong> {seatNumbers}
                  </p>
                )}

                <p>
                  <strong>Tổng tiền:</strong>{' '}
                  <span
                    style={{
                      color: '#e7c99b',
                      fontWeight: '700',
                    }}
                  >
                    {formatMoney(booking.totalAmount)}
                  </span>
                </p>

                {booking.paymentReviewRequired && (
                  <p className="form-error">
                    Giao dịch cần được đối soát.
                    Vé chưa được cấp.
                  </p>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '10px',
                  marginTop: '15px',
                }}
              >
                {isPaid && (
                  <Link
                    to={`/tickets/${booking.id}`}
                    className="primary-button"
                  >
                    Xem vé →
                  </Link>
                )}

                {isPending && (
                  <Link
                    to={`/checkout/${booking.id}`}
                    className="primary-button"
                  >
                    Tiếp tục thanh toán →
                  </Link>
                )}

                {!isPaid && !isPending && (
                  <span className="muted">
                    Đơn không còn hiệu lực
                  </span>
                )}
              </div>
            </article>
          );
        })}
    </div>
  );
}
