import { bookApi, ReadStatus } from '../api/bookApi';

export interface LibraryBook {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  status: 'reading' | 'want_to_read' | 'read' | 'none';
  progress: number; // 0 - 100
  totalPage: number;
  currentPage: number;
  startDate?: string;
  finishedDate?: string;
  rating?: number;
}

export const libraryService = {
  // Lấy sách trong tủ theo trạng thái
  async getMyBooks(status: 'reading' | 'want_to_read' | 'read'): Promise<LibraryBook[]> {
    try {
      // Map frontend status to backend enum
      let apiStatus: ReadStatus;
      if (status === 'reading') apiStatus = ReadStatus.READING;
      else if (status === 'read') apiStatus = ReadStatus.READ;
      else apiStatus = ReadStatus.WANT_TO_READ;

      const resp: any = await bookApi.getBookshelf(apiStatus);
      const dataList = resp.result || [];

      // Map to LibraryBook UI interface
      return dataList.map((item: any) => {
        let coverUrl = item.coverImage;
        if (coverUrl && !coverUrl.startsWith('http')) {
           coverUrl = `http://10.0.2.2:8888/file/legacy/covers/${coverUrl}`;
        }
        return {
          id: item.id,
          title: item.title,
          author: item.authors?.[0] || 'Unknown',
          coverUrl: coverUrl,
          status: status,
          progress: item.progressPercent || 0,
          totalPage: item.totalPages || 0,
          currentPage: 0, // Fallback if no specific page concept
          rating: item.userRating || 0,
        };
      });
    } catch (error) {
      console.error('Error fetching library books:', error);
      throw error;
    }
  },

  // Thêm/Sửa trạng thái sách trong tủ
  async updateShelf(id: string, status: 'reading' | 'want_to_read' | 'read' | 'none') {
    if (status === 'none') {
       // Backend API doesn't seem to have REMOVE FROM SHELF directly inside /shelf.
       // Would normally just delete from shelf, but for now we might leave it.
       // Actually the backend updateShelf takes ReadStatus. If it's none, we might not call it, or need a DELETE api.
       console.log('Remove from shelf not fully supported by backend yet');
       return;
    }

    let apiStatus: ReadStatus;
    if (status === 'reading') apiStatus = ReadStatus.READING;
    else if (status === 'read') apiStatus = ReadStatus.READ;
    else apiStatus = ReadStatus.WANT_TO_READ;

    await bookApi.updateShelf(id, apiStatus);
  }
};
