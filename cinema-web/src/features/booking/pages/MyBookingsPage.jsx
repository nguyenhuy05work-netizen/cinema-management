import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { bookingApi } from '../api/bookingApi';

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    bookingApi
      .getMine()
      .then((data) => {
        if (active) setBookings(data);
      })
      .catch(() => {
        if (active) {
          setError('Không thể tải lịch sử đặt vé.');
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="page-shell">
      <h1>Đơn đặt vé của tôi</h1>

      {error && <p className="form-error">{error}</p>}

      {!bookings && !error && <p>Đang tải...</p>}

      {bookings?.length === 0 && <p>Chưa có đơn đặt vé.</p>}

      {bookings?.map((booking) => (
        <article className="notification-item" key={booking.id}>
          <div>
            <strong>{booking.movieTitle}</strong>

            <p>
              BK-{booking.id} · {booking.hallName} · {booking.status}
            </p>

            <p>
              {Number(booking.totalAmount).toLocaleString('vi-VN')} đ
            </p>
          </div>

          <Link to={`/checkout/${booking.id}`}>
            Xem đơn / vé →
          </Link>
        </article>
      ))}
    </div>
  );
}