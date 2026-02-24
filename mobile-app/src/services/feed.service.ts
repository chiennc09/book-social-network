import { Post } from '../types';

export const feedService = {
  async getFeed(filter: string = 'foryou'): Promise<Post[]> {
    // filter: 'foryou' | 'following'
    
    console.log(`Fetching feed with filter: ${filter}`);
    
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            id: '1',
            user: {
              id: 'u1',
              username: 'chienz',
              displayName: 'Chien',
              avatar: 'https://randomuser.me/api/portraits/men/44.jpg',
            },
            content: 'Đọc cuốn này thấy thấm thía quá, đặc biệt là đoạn về tư duy phản biện. Mọi người nên đọc thử nhé! 👇',
            book: {
              id: 'b1',
              title: 'Tư Duy Nhanh Và Chậm',
              author: 'Daniel Kahneman',
              coverUrl: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1317793965i/11468377.jpg',
            },
            likesCount: 6600,
            commentsCount: 60,
            repostsCount: 273,
            timestamp: '18 giờ',
          },
          {
            id: '2',
            user: {
              id: 'u2',
              username: '_km.2',
              displayName: 'Hehe',
              avatar: 'https://randomuser.me/api/portraits/men/68.jpg',
            },
            content: 'Cuối tuần chill nhẹ nhàng với cuốn tiểu thuyết này. Màu văn trong trẻo thực sự.',
            book: {
              id: 'b2',
              title: 'Rừng Na Uy',
              author: 'Haruki Murakami',
              coverUrl: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1630460042i/11297.jpg',
            },
            images: [
              'https://images.unsplash.com/photo-1512820790803-83ca734da794?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
              'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
            ],
            likesCount: 762,
            commentsCount: 3,
            repostsCount: 2,
            timestamp: '23 giờ',
          },
          {
            id: '3',
            user: {
              id: 'u3',
              username: 'chien.pham',
              displayName: 'Chiến Phạm',
              avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
            },
            content: 'Sách về coding mà viết cuốn ghê. Clean Code là chân ái!',
            book: {
              id: 'b3',
              title: 'Clean Code',
              author: 'Robert C. Martin',
              coverUrl: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1436202607i/3735293.jpg',
            },
            likesCount: 120,
            commentsCount: 15,
            repostsCount: 5,
            timestamp: '1 giờ',
          },
        ]);
      }, 500);
    });
  },
};