import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Card, CircularProgress, Typography } from "@mui/material";
import { isAuthenticated, logOut } from "../services/authService";
import { getMyPosts } from "../services/postService";
import Post from "../components/layout/Post";
import Scene from "../components/layout/Scene";
import type { GetPostsResponse, PostData } from "../types";


export default function PostPage() {
  const [posts, setPosts] = useState<PostData[]>([]);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [hasMore, setHasMore] = useState<boolean>(false);

  const observer = useRef<IntersectionObserver | null>(null);
  const lastPostElementRef = useRef<HTMLDivElement | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login");
    } else {
      loadPosts(page);
    }
  }, [navigate, page]);

  const loadPosts = (page: number) => {
    console.log(`loading posts for page ${page}`);
    setLoading(true);
    getMyPosts(page)
      .then((response: GetPostsResponse) => {
        setTotalPages(response.result.totalPages);
        setPosts((prevPosts) => [...prevPosts, ...response.result.data]);
        setHasMore(response.result.data.length > 0);
        console.log("loaded posts:", response.result);
      })
      .catch((error: any) => {
        if (error.response?.status === 401) {
          logOut();
          navigate("/login");
        }
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!hasMore) return;

    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        if (page < totalPages) {
          setPage((prevPage) => prevPage + 1);
        }
      }
    });

    if (lastPostElementRef.current) {
      observer.current.observe(lastPostElementRef.current);
    }

    setHasMore(false);
  }, [hasMore, page, totalPages]);

  return (
    <>
      <Card
        sx={{
          minWidth: 500,
          maxWidth: 600,
          boxShadow: 3,
          borderRadius: 2,
          padding: "20px",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            width: "100%",
            gap: "10px",
          }}
        >
          <Typography
            sx={{
              fontSize: 18,
              mb: "10px",
            }}
          >
            Your posts,
          </Typography>
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
              width: "100%",
            }}
          ></Box>
          {posts.map((post, index) => {
            if (posts.length === index + 1) {
              return (
                <div ref={lastPostElementRef} key={post.id}>
                  <Post post={post} />
                </div>
              );
            } else {
              return <Post key={post.id} post={post} />;
            }
          })}
          {loading && (
            <Box
              sx={{ display: "flex", justifyContent: "center", width: "100%" }}
            >
              <CircularProgress size="24px" />
            </Box>
          )}
        </Box>
      </Card>
    </>
  );
}
