import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { bookingApi } from '../api/bookingApi';
import { useAuth } from '../../../context/AuthContext';

const money = (value) =>
  Number(value).toLocaleString('vi-VN') + ' đ';

const labels = {
  PENDING: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  CANCELLED: 'Đã hủy',
  EXPIRED: 'Đã hết hạn',
};

export default function CheckoutPage() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();

  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    let active = true;
    let loading = false;

    const load = async () => {
      if (loading) return;
      loading = true;

      try {
        const data = await bookingApi.getById(id);

        if (active) {
          setBooking(data);
          setError('');
        }
      } catch (requestError) {
        if (active) {
          setError(
            requestError.response?.data?.message ||
              'Không thể tải đơn đặt vé.'
          );
        }
      } finally {
        loading = false;
      }
    };

    load();

    const poll = setInterval(load, 5000);
    const clock = setInterval(() => setNow(Date.now()), 1000);

    return () => {
      active = false;
      clearInterval(poll);
      clearInterval(clock);
    };
  }, [id, isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="page-shell">
        <p>
          Vui lòng <Link to="/login">đăng nhập</Link> để xem đơn đặt vé.
        </p>
      </div>
    );
  }

  if (!booking || booking.id !== Number(id)) {
    return (
      <div className="page-shell">
        <p className={error ? 'form-error' : 'muted'}>
          {error || 'Đang tải đơn đặt vé...'}
        </p>
      </div>
    );
  }

  const seconds = Math.max(
    0,
    Math.ceil((Date.parse(booking.holdExpiresAt) - now) / 1000)
  );

  const pay = async () => {
    setBusy(true);
    setError('');

    try {
      const result = await bookingApi.paymentUrl(id);
      const destination = new URL(result.paymentUrl);

      if (destination.protocol !== 'https:') {
        throw new Error('URL thanh toán không hợp lệ.');
      }

      window.location.assign(destination.href);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.response?.data?.detail ||
          requestError.message ||
          'Không thể mở VNPay.'
      );

      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!window.confirm('Hủy đơn và nhả các ghế đang giữ?')) return;

    setBusy(true);
    setError('');

    try {
      setBooking(await bookingApi.cancel(id));
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || 'Không thể hủy đơn.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-shell">
      <Link
        className="back-link"
        to={`/showtimes/${booking.showtimeId}`}
      >
        ← Xem suất chiếu
      </Link>

      <section className="section-heading">
        <div>
          <p className="eyebrow">ĐƠN BK-{booking.id}</p>
          <h1>{booking.movieTitle}</h1>

          <p>
            {booking.hallName} ·{' '}
            {new Date(booking.startTime).toLocaleString('vi-VN')}
          </p>
        </div>

        <strong>{labels[booking.status] || booking.status}</strong>
      </section>

      <div className="admin-form">
        <h2>Ghế và giá vé</h2>

        {booking.seats.map((seat) => (
          <p key={seat.seatId}>
            <strong>{seat.seatNumber}</strong> — {money(seat.price)}

            {seat.ticketCode && (
              <>
                <br />
                <span>Mã vé: {seat.ticketCode}</span>
              </>
            )}
          </p>
        ))}

        <h2>Tổng tiền: {money(booking.totalAmount)}</h2>

        {booking.status === 'PENDING' && (
          <>
            <p>
              Còn {Math.floor(seconds / 60)}:
              {String(seconds % 60).padStart(2, '0')} để thanh toán.
            </p>

            <p className="muted">
              Thanh toán qua VNPay sandbox. Vé được cấp sau khi hệ
              thống nhận xác nhận từ VNPay; trang này tự cập nhật
              trạng thái.
            </p>

            <button
              className="primary-button"
              disabled={busy || seconds === 0}
              onClick={pay}
            >
              {busy ? 'Đang xử lý...' : 'Thanh toán VNPay sandbox'}
            </button>

            <button
              className="text-button"
              disabled={busy}
              onClick={cancel}
            >
              Hủy đơn và nhả ghế
            </button>

            {seconds === 0 && (
              <p className="form-error">
                Thời gian thanh toán đã hết. Đang cập nhật trạng thái đơn.
              </p>
            )}
          </>
        )}

        {booking.status === 'PAID' && (
          <p className="form-success">
            Thanh toán đã được xác nhận. Vui lòng lưu mã vé bên trên.
          </p>
        )}

        {booking.paymentReviewRequired && (
          <p className="form-error">
            VNPay đã báo nhận tiền sau khi đơn không còn hiệu lực.
            Vé chưa được cấp; vui lòng liên hệ rạp với mã BK-{booking.id}
            {' '}để đối soát và hoàn tiền.
          </p>
        )}

        {['CANCELLED', 'EXPIRED'].includes(booking.status) && (
          <p>
            Đơn không còn hiệu lực. Hãy quay lại suất chiếu để chọn
            ghế mới.
          </p>
        )}

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}