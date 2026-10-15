import { useState } from 'react';

const reviews = [
  {
    category: 'Đánh giá phim',
    score: '4.5',
    title: 'Dư âm mùa hạ: một lá thư tình gửi những ngày đã cũ',
    excerpt: 'Một câu chuyện nhỏ được kể bằng khung hình rộng mở, dịu dàng nhắc ta rằng trưởng thành đôi khi chỉ là học cách nói lời tạm biệt.',
    author: 'An Nhiên',
    role: 'Biên tập viên điện ảnh',
    date: '12.06.2026',
    tone: 'peach',
    initials: 'D',
    label: 'GÓC NHÌN BIÊN TẬP',
  },
  {
    category: 'Góc nhìn',
    score: '4.0',
    title: 'Sau lớp màn kỳ ảo, bộ phim đặt câu hỏi gì về lòng can đảm?',
    excerpt: 'Thế giới giả tưởng đầy màu sắc là lớp vỏ cho một hành trình rất gần gũi: học cách tin vào lựa chọn của chính mình.',
    author: 'Minh Khuê',
    role: 'Nhà phê bình độc lập',
    date: '09.06.2026',
    tone: 'violet',
    initials: 'K',
    label: 'PHÂN TÍCH',
  },
  {
    category: 'Phỏng vấn',
    score: '—',
    title: 'Ở hậu trường một bộ phim khiến khán giả bật cười',
    excerpt: 'Đạo diễn kể về những lần ứng biến trên trường quay và khoảnh khắc cả ê-kíp biết mình đang tạo nên điều đặc biệt.',
    author: 'Hoàng Duy',
    role: 'Phóng viên văn hóa',
    date: '04.06.2026',
    tone: 'blue',
    initials: 'H',
    label: 'TRÒ CHUYỆN',
  },
];

const categories = ['Tất cả', 'Đánh giá phim', 'Góc nhìn', 'Phỏng vấn'];

const ReviewsPage = () => {
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const visibleReviews = activeCategory === 'Tất cả'
    ? reviews
    : reviews.filter((review) => review.category === activeCategory);

  return (
    <div className="page-shell editorial-page">
      <section className="editorial-hero">
        <div className="editorial-hero-copy">
          <p className="eyebrow">TẠP CHÍ CINEF · SỐ 06</p>
          <h1>Một bộ phim.<br /><span>Muôn góc nhìn.</span></h1>
          <p>Những bài đánh giá, trò chuyện và ghi chép điện ảnh được tuyển chọn bởi đội ngũ biên tập CineF.</p>
          <a className="editorial-hero-link" href="#latest-reviews">Khám phá bài viết <span>↓</span></a>
        </div>
        <div className="editorial-cover" aria-label="Minh họa bìa tạp chí điện ảnh">
          <span className="cover-kicker">THE CINEF JOURNAL</span>
          <div className="cover-sun" />
          <span className="cover-title">AFTER<br />THE<br />LIGHT</span>
          <span className="cover-issue">FILM · CULTURE · PEOPLE &nbsp; / &nbsp; VOL. 06</span>
          <span className="cover-caption">A story worth<br />staying for.</span>
        </div>
      </section>

      <section className="review-section" id="latest-reviews">
        <div className="review-section-heading">
          <div><p className="eyebrow">ĐỌC & CẢM NHẬN</p><h2>Góc nhìn điện ảnh</h2></div>
          <span className="editorial-demo-note">Nội dung mẫu giới thiệu giao diện</span>
        </div>
        <div className="review-filters" aria-label="Lọc bài viết">
          {categories.map((category) => (
            <button
              type="button"
              key={category}
              className={activeCategory === category ? 'active' : ''}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
        <div className="review-grid">
          {visibleReviews.map((review) => (
            <article className={`review-card ${review.tone}`} key={review.title}>
              <div className="review-art"><span>{review.initials}</span><small>{review.label}</small><i /></div>
              <div className="review-card-content">
                <div className="review-meta"><span>{review.category}</span><time>{review.date}</time></div>
                <h3>{review.title}</h3>
                <p>{review.excerpt}</p>
                <div className="review-byline">
                  <span className="review-avatar">{review.author.slice(0, 1)}</span>
                  <span><strong>{review.author}</strong><small>{review.role}</small></span>
                  {review.score !== '—' && <span className="review-score">★ {review.score}</span>}
                </div>
              </div>
            </article>
          ))}
        </div>
        <div className="editorial-disclaimer">Các tên phim, bài viết và tác giả trên trang này là nội dung minh họa cho giao diện, không đại diện cho đánh giá hoặc phát ngôn của một cơ quan báo chí có thật.</div>
      </section>
    </div>
  );
};

export default ReviewsPage;
