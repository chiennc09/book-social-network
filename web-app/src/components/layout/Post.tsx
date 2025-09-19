import { Box, Avatar, Typography } from "@mui/material";
import React, { forwardRef } from "react";
import type { PostData } from "../../types";

// Định nghĩa props cho component Post
interface PostProps {
  post: PostData;
}

const Post = forwardRef<HTMLDivElement, PostProps>(({ post }, ref) => {

  return (
    <Box
      ref={ref}
      sx={{
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "start",
          marginBottom: 2,
        }}
      >
        <Avatar src="https://cdn2.iconfinder.com/data/icons/picol-vector/32/avatar_edit-512.png" sx={{ marginRight: 2 }} />
        <Box>
          <Box sx={{ display: "flex", flexDirection: "column" }}>
            <Typography
              sx={{
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {post.username}
            </Typography>
            <Typography
              sx={{
                fontSize: 14,
                fontWeight: 400,
              }}
            >
              {post.created}
            </Typography>
          </Box>
          <Typography
            sx={{
              fontSize: 14,
            }}
          >
            {post.content}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
});

Post.displayName = "Post"; // thêm để tránh warning khi dùng forwardRef

export default Post;
