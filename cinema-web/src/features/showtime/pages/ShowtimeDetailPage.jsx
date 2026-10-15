import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { showtimeApi } from '../api/showtimeApi';
import { bookingApi } from '../../booking/api/bookingApi';
import { useAuth } from '../../../context/AuthContext';

export default function ShowtimeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [showtime, setShowtime] = useState(null);
  const [layout, setLayout] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [holding, setHolding] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    let loading = false;
    let firstLoad = true;

    const load = async () => {
      if (loading) return;
      loading = true;

      try {
        const [details, seats] = await Promise.all([
          showtimeApi.getById(id),
          showtimeApi.getSeats(id),
        ]);

        if (active) {
          if (firstLoad) {
            setSelectedSeats([]);
            firstLoad = false;
          }

          setShowtime(details);
          setLayout(seats);
          setError('');
        }
      } catch {
        if (active) {
          setError('Không thể tải sơ đồ ghế.');
        }
      } finally {
        loading = false;
      }
    };

    load();

    const poll = setInterval(load, 5000);

    return () => {
      active = false;
      clearInterval(poll);
    };
  }, [id]);

  if (!showtime || !layout || showtime.id !== Number(id)) {
    return (
      <div className="page-shell">
        <p>{error || 'Đang tải sơ đồ ghế...'}</p>
      </div>
    );
  }

  const seats = layout.seats || [];

  const selectedDetails = seats.filter((seat) =>
    selectedSeats.includes(seat.seatId)
  );

  const total = selectedDetails.reduce(
    (sum, seat) => sum + Number(seat.price),
    0
  );

  const staleSelection =
    selectedDetails.length !== selectedSeats.length ||
    selectedDetails.some((seat) => seat.status !== 'AVAILABLE');

  const toggle = (seat) => {
    if (seat.status !== 'AVAILABLE' || holding) return;

    setMessage('');

    setSelectedSeats((current) =>
      current.includes(seat.seatId)
        ? current.filter((value) => value !== seat.seatId)
        : [...current, seat.seatId]
    );
  };

  const reserve = async () => {
    if (!isAuthenticated) {
      setMessage('Vui lòng đăng nhập để đặt vé.');
      return;
    }

    setHolding(true);
    setMessage('');

    try {
      const booking = await bookingApi.create({
        showtimeId: Number(id),
        seatIds: selectedSeats,
      });

      navigate(`/checkout/${booking.id}`);
    } catch (requestError) {
      setMessage(
        requestError.response?.data?.message ||
          'Không thể giữ ghế. Vui lòng kiểm tra lại sơ đồ.'
      );

      try {
        setLayout(await showtimeApi.getSeats(id));
      } catch {
        setError('Không thể cập nhật sơ đồ ghế.');
      }
    } finally {
      setHolding(false);
    }
  };

  return (
    <div className="page-shell">
      <Link
        className="back-link"
        to={`/movies/${showtime.movieId}`}
      >
        ← Quay lại phim
      </Link>

      <section className="section-heading">
        <div>
          <p className="eyebrow">{showtime.movieTitle}</p>
          <h1>{showtime.hallName}</h1>

          <p className="muted">
            {new Date(showtime.startTime).toLocaleString('vi-VN')}
          </p>
        </div>

        <div className="availability">
          {layout.availableSeats}
          <span>ghế trống</span>
        </div>
      </section>

      <div className="seat-panel">
        <div className="screen-label">MÀN HÌNH</div>

        <div className="seat-grid">
          {seats.map((seat) => (
            <button
              type="button"
              key={seat.seatId}
              className={`seat seat-${seat.status.toLowerCase()} seat-${seat.seatType.toLowerCase()} ${
                selectedSeats.includes(seat.seatId)
                  ? 'seat-selected'
                  : ''
              }`}
              disabled={
                holding ||
                (seat.status !== 'AVAILABLE' &&
                  !selectedSeats.includes(seat.seatId))
              }
              title={`${seat.seatNumber}: ${Number(
                seat.price
              ).toLocaleString('vi-VN')} đ`}
              onClick={() =>
                selectedSeats.includes(seat.seatId) &&
                seat.status !== 'AVAILABLE'
                  ? setSelectedSeats((current) =>
                      current.filter(
                        (value) => value !== seat.seatId
                      )
                    )
                  : toggle(seat)
              }
            >
              {seat.seatNumber}
            </button>
          ))}
        </div>

        {!seats.length && (
          <p className="muted">
            Sơ đồ ghế chưa được thiết lập.
          </p>
        )}

        <div className="seat-legend">
          <span>
            <i className="legend available" />
            Trống
          </span>

          <span>
            <i className="legend unavailable" />
            Đang giữ/đã bán
          </span>

          <span>
            <i className="legend legend-vip" />
            VIP
          </span>

          <span>
            <i className="legend legend-couple" />
            Couple
          </span>
        </div>

        <div className="seat-booking-bar">
          <div>
            <strong>{selectedSeats.length} ghế đã chọn</strong>
            <span>{total.toLocaleString('vi-VN')} đ</span>
          </div>

          <button
            className="primary-button"
            disabled={
              holding ||
              !selectedSeats.length ||
              staleSelection
            }
            onClick={reserve}
          >
            {holding
              ? 'Đang tạo đơn...'
              : 'Giữ ghế và tiếp tục'}
          </button>
        </div>

        <p className="muted">
          Ghế được giữ tối đa 15 phút sau khi tạo đơn, hoặc
          đến khi suất chiếu bắt đầu. Giá thanh toán do hệ
          thống xác nhận.
        </p>

        {staleSelection && (
          <p className="form-error">
            Một số ghế đã được người khác giữ. Hãy bỏ chọn
            và chọn lại.
          </p>
        )}

        {(message || error) && (
          <p className="form-error" role="alert">
            {message || error}
          </p>
        )}
      </div>
    </div>
  );
}