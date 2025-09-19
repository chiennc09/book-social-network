import axiosClient from "../api/axiosClient";
import type { GetPostsResponse } from "../types";

export const getMyPosts = async (page: number): Promise<GetPostsResponse> => {
  const response = await axiosClient.get<GetPostsResponse>(
    "/post/my-posts",
    {
      params: { page, size : 10 },
    }
  );
  return response.data;
};
