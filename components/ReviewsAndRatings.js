"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import Image from "next/image";
import { db } from "@/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  setDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  orderBy,
  limit,
} from "firebase/firestore";
import { motion } from "framer-motion";
import Button from "@/components/Button";
import FormInput from "@/components/FormInput";
import { useToast } from "@/context/AuthContext";

export default function ReviewsAndRatings({ movieId }) {
  const { user } = useAuth();
  const { addToast } = useToast?.() || {};
  
  const [reviews, setReviews] = useState([]);
  const [userRating, setUserRating] = useState(0);
  const [userReview, setUserReview] = useState("");
  const [averageRating, setAverageRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Load reviews and ratings
  useEffect(() => {
    const loadReviews = async () => {
      try {
        setLoading(true);
        
        // Get all reviews for movie
        const reviewsRef = collection(db, `movies/${movieId}/reviews`);
        const reviewsSnap = await getDocs(
          query(reviewsRef, orderBy("createdAt", "desc"), limit(20))
        );

        const reviewsData = reviewsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setReviews(reviewsData);

        // Calculate average rating
        if (reviewsData.length > 0) {
          const avg =
            reviewsData.reduce((sum, r) => sum + (r.rating || 0), 0) /
            reviewsData.length;
          setAverageRating(parseFloat(avg.toFixed(1)));
        }

        // Get user's review if exists
        if (user) {
          const userReviewDoc = reviewsSnap.docs.find(
            (doc) => doc.data().userId === user.uid
          );
          if (userReviewDoc) {
            setUserRating(userReviewDoc.data().rating || 0);
            setUserReview(userReviewDoc.data().title || "");
          }
        }
      } catch (err) {
        console.error("Error loading reviews:", err);
      } finally {
        setLoading(false);
      }
    };

    if (movieId) {
      loadReviews();
    }
  }, [movieId, user]);

  // Submit review
  const handleSubmitReview = useCallback(
    async (e) => {
      e.preventDefault();

      if (!user) {
        addToast?.({
          type: "error",
          message: "Please login to submit a review",
        });
        return;
      }

      if (!userRating) {
        addToast?.({
          type: "warning",
          message: "Please select a rating",
        });
        return;
      }

      try {
        setSubmitting(true);

        const reviewRef = doc(db, `movies/${movieId}/reviews/${user.uid}`);

        await setDoc(
          reviewRef,
          {
            userId: user.uid,
            userName: user.displayName || "Anonymous",
            userPhoto: user.photoURL || "",
            rating: userRating,
            title: userReview,
            helpful: 0,
            unhelpful: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        addToast?.({
          type: "success",
          message: "Review submitted successfully!",
        });

        // Reload reviews
        const reviewsRef = collection(db, `movies/${movieId}/reviews`);
        const reviewsSnap = await getDocs(
          query(reviewsRef, orderBy("createdAt", "desc"))
        );
        const reviewsData = reviewsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setReviews(reviewsData);
      } catch (err) {
        console.error("Error submitting review:", err);
        addToast?.({
          type: "error",
          message: "Failed to submit review",
        });
      } finally {
        setSubmitting(false);
      }
    },
    [user, userRating, userReview, movieId, addToast]
  );

  return (
    <div className="space-y-8">
      {/* Rating Summary */}
      <div className="glass-card rounded-2xl p-6 md:p-8 border border-white/10">
        <div className="flex items-end justify-between">
          <div>
            <h3 className="text-2xl font-black mb-2">Reviews & Ratings</h3>
            <p className="text-gray-400 text-sm">
              {reviews.length} rating{reviews.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="text-center">
            <div className="text-5xl font-black text-cyan-400">
              {averageRating}
            </div>
            <div className="flex gap-1 mt-2 justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={
                    star <= Math.round(averageRating)
                      ? "text-yellow-400 text-xl"
                      : "text-gray-500 text-xl"
                  }
                >
                  ★
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Write Review Form */}
      {user && (
        <form
          onSubmit={handleSubmitReview}
          className="glass-card rounded-2xl p-6 md:p-8 border border-white/10 space-y-6"
        >
          <h4 className="text-xl font-bold">Share Your Thoughts</h4>

          {/* Star Rating */}
          <div>
            <label className="block text-sm font-semibold mb-3">
              Your Rating
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setUserRating(star)}
                  className="text-3xl transition hover:scale-110"
                >
                  <span
                    className={
                      star <= userRating
                        ? "text-yellow-400"
                        : "text-gray-500"
                    }
                  >
                    ★
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Review Text */}
          <FormInput
            label="Your Review"
            value={userReview}
            onChange={(e) => setUserReview(e.target.value)}
            placeholder="What did you think about this movie?"
            maxLength={500}
          />

          <div className="text-sm text-gray-400">
            {userReview.length}/500 characters
          </div>

          <Button
            type="submit"
            disabled={submitting || !userRating}
            loading={submitting}
            variant="primary"
          >
            Submit Review
          </Button>
        </form>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        <h4 className="text-lg font-bold">Community Reviews</h4>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="glass-card rounded-2xl p-4 h-24 bg-white/5 animate-pulse"
              />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p>No reviews yet. Be the first to share your thoughts!</p>
          </div>
        ) : (
          reviews.map((review, index) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              className="glass-card rounded-2xl p-6 border border-white/10 hover:border-white/20 transition"
            >
              {/* User Info */}
              <div className="flex items-center gap-3 mb-3">
                {review.userPhoto && (
                  <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                    <Image
                      src={review.userPhoto}
                      alt={review.userName}
                      fill
                      className="object-cover"
                      sizes="40px"
                      priority={false}
                    />
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-semibold">{review.userName}</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className={
                          star <= (review.rating || 0)
                            ? "text-yellow-400 text-sm"
                            : "text-gray-500 text-sm"
                        }
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Review Text */}
              {review.title && (
                <p className="text-gray-200 text-sm leading-relaxed">
                  {review.title}
                </p>
              )}

              {/* Date */}
              <p className="text-xs text-gray-500 mt-3">
                {new Date(
                  review.createdAt?.toDate?.() || review.createdAt
                ).toLocaleDateString()}
              </p>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
