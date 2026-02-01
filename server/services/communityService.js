/**
 * CommunityService
 * Handles community posts, comments, groups, and content moderation
 * Provides feed generation, search, and trending algorithms
 */

import {
  CommunityPost,
  POST_CATEGORIES,
  POST_STATUS,
  AUTHOR_TYPE,
} from '../models/CommunityPost.js';
import { Comment, COMMENT_STATUS } from '../models/Comment.js';
import {
  CommunityGroup,
  GROUP_CATEGORIES,
  GROUP_STATUS,
  MEMBER_ROLES,
} from '../models/CommunityGroup.js';
import { PublicProfile } from '../models/PublicProfile.js';
import NotificationService from './notificationService.js';

// Simple content moderation patterns (can be replaced with ML-based solution)
const MODERATION_PATTERNS = {
  spam: [
    /\b(buy now|click here|limited time|act now|order now)\b/gi,
    /(https?:\/\/[^\s]+){3,}/g, // Multiple URLs
    /\b(viagra|cialis|casino|lottery|winner)\b/gi,
  ],
  harassment: [
    /\b(stupid|idiot|moron|loser|dumb)\b/gi,
  ],
  profanity: [
    /\b(damn|hell|crap|ass|bastard)\b/gi,
  ],
};

class CommunityService {
  constructor() {
    this.notificationService = new NotificationService();
  }

  // ==================== POST MANAGEMENT ====================

  /**
   * Create a new community post
   */
  async createPost(postData, authorId, authorType = AUTHOR_TYPE.USER) {
    try {
      // Moderate content
      const moderationResult = this.moderateContent(postData.title + ' ' + postData.content);
      
      const post = new CommunityPost({
        ...postData,
        authorId,
        authorType,
        status: moderationResult.isFlagged ? POST_STATUS.FLAGGED : POST_STATUS.ACTIVE,
        moderationFlags: moderationResult.flags,
      });

      await post.save();

      // Update user's public profile stats if applicable
      if (authorType === AUTHOR_TYPE.USER) {
        await PublicProfile.updateOne(
          { userId: authorId },
          { $inc: { 'statistics.contentPublished': 1 } }
        );
      }

      // If post is in a group, update group stats
      if (post.groupId) {
        await CommunityGroup.findByIdAndUpdate(post.groupId, {
          $inc: { postsCount: 1, 'statistics.totalPosts': 1 },
          $set: { 'statistics.lastActivityAt': new Date() },
        });
      }

      // Notify group members if post is in a group
      if (post.groupId && post.status === POST_STATUS.ACTIVE) {
        await this.notifyGroupMembers(post.groupId, post._id, authorId);
      }

      return {
        success: true,
        post: await this.getPostById(post._id, authorId),
        moderation: moderationResult,
      };
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  }

  /**
   * Get post by ID with full details
   */
  async getPostById(postId, currentUserId = null) {
    try {
      const post = await CommunityPost.findById(postId)
        .populate('authorId', 'name avatar companyName displayName')
        .populate('groupId', 'name slug')
        .lean();

      if (!post) {
        throw new Error('Post not found');
      }

      // Add view if user is viewing
      if (currentUserId) {
        await CommunityPost.findByIdAndUpdate(postId, {
          $addToSet: { uniqueViewers: currentUserId },
          $inc: { views: 1 },
        });
      }

      // Get comment count
      const commentCount = await Comment.getCommentCount(postId);

      return {
        ...post,
        commentCount,
        isLiked: currentUserId ? post.likes?.some(l => l.userId.toString() === currentUserId.toString()) : false,
      };
    } catch (error) {
      console.error('Error getting post:', error);
      throw error;
    }
  }

  /**
   * Update a post
   */
  async updatePost(postId, updateData, userId) {
    try {
      const post = await CommunityPost.findById(postId);
      
      if (!post) {
        throw new Error('Post not found');
      }

      // Check ownership
      if (post.authorId.toString() !== userId.toString()) {
        throw new Error('Unauthorized to update this post');
      }

      // Moderate updated content
      const moderationResult = this.moderateContent(
        (updateData.title || post.title) + ' ' + (updateData.content || post.content)
      );

      const updatedPost = await CommunityPost.findByIdAndUpdate(
        postId,
        {
          ...updateData,
          status: moderationResult.isFlagged ? POST_STATUS.FLAGGED : post.status,
          $push: {
            moderationFlags: { $each: moderationResult.flags },
          },
        },
        { new: true }
      ).populate('authorId', 'name avatar companyName displayName');

      return {
        success: true,
        post: updatedPost,
        moderation: moderationResult,
      };
    } catch (error) {
      console.error('Error updating post:', error);
      throw error;
    }
  }

  /**
   * Delete a post
   */
  async deletePost(postId, userId, isAdmin = false) {
    try {
      const post = await CommunityPost.findById(postId);
      
      if (!post) {
        throw new Error('Post not found');
      }

      // Check ownership or admin
      if (!isAdmin && post.authorId.toString() !== userId.toString()) {
        throw new Error('Unauthorized to delete this post');
      }

      // Soft delete
      await CommunityPost.findByIdAndUpdate(postId, {
        status: POST_STATUS.REMOVED,
      });

      // Update group stats if applicable
      if (post.groupId) {
        await CommunityGroup.findByIdAndUpdate(post.groupId, {
          $inc: { postsCount: -1, 'statistics.totalPosts': -1 },
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting post:', error);
      throw error;
    }
  }

  /**
   * Like/unlike a post
   */
  async togglePostLike(postId, userId) {
    try {
      const post = await CommunityPost.findById(postId);
      
      if (!post) {
        throw new Error('Post not found');
      }

      const isLiked = post.isLikedBy(userId);

      if (isLiked) {
        post.removeLike(userId);
      } else {
        post.addLike(userId);
        
        // Notify post author (if not self-like)
        if (post.authorId.toString() !== userId.toString()) {
          await this.notificationService.create({
            userId: post.authorId,
            type: 'post_liked',
            title: 'New Like on Your Post',
            message: 'Someone liked your post',
            data: { postId, likedBy: userId },
          });
        }
      }

      await post.save();

      return {
        success: true,
        isLiked: !isLiked,
        likeCount: post.likeCount,
      };
    } catch (error) {
      console.error('Error toggling post like:', error);
      throw error;
    }
  }

  // ==================== COMMENT MANAGEMENT ====================

  /**
   * Add a comment to a post
   */
  async addComment(postId, commentData, authorId, authorType = AUTHOR_TYPE.USER) {
    try {
      // Check if post exists and is active
      const post = await CommunityPost.findById(postId);
      if (!post || post.status !== POST_STATUS.ACTIVE) {
        throw new Error('Post not found or inactive');
      }

      // Moderate content
      const moderationResult = this.moderateContent(commentData.content);

      const comment = new Comment({
        postId,
        authorId,
        authorType,
        content: commentData.content,
        parentId: commentData.parentId || null,
        status: moderationResult.isFlagged ? COMMENT_STATUS.FLAGGED : COMMENT_STATUS.ACTIVE,
        moderationFlags: moderationResult.flags,
        mentions: this.extractMentions(commentData.content),
      });

      await comment.save();

      // Update post with comment reference
      post.addComment(comment._id, authorId);
      await post.save();

      // Notify post author (if not self-comment)
      if (post.authorId.toString() !== authorId.toString()) {
        await this.notificationService.create({
          userId: post.authorId,
          type: 'post_commented',
          title: 'New Comment on Your Post',
          message: 'Someone commented on your post',
          data: { postId, commentId: comment._id },
        });
      }

      // Notify mentioned users
      if (comment.mentions?.length > 0) {
        for (const mention of comment.mentions) {
          await this.notificationService.create({
            userId: mention.userId,
            type: 'mentioned_in_comment',
            title: 'You Were Mentioned',
            message: `Someone mentioned you in a comment`,
            data: { postId, commentId: comment._id },
          });
        }
      }

      // Notify parent comment author if it's a reply
      if (commentData.parentId) {
        const parentComment = await Comment.findById(commentData.parentId);
        if (parentComment && parentComment.authorId.toString() !== authorId.toString()) {
          await this.notificationService.create({
            userId: parentComment.authorId,
            type: 'comment_replied',
            title: 'New Reply to Your Comment',
            message: 'Someone replied to your comment',
            data: { postId, commentId: comment._id, parentId: commentData.parentId },
          });
        }
      }

      return {
        success: true,
        comment: await Comment.findById(comment._id)
          .populate('authorId', 'name avatar companyName displayName')
          .lean(),
        moderation: moderationResult,
      };
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  }

  /**
   * Get comments for a post (threaded)
   */
  async getComments(postId, options = {}) {
    try {
      const { limit = 50, skip = 0, sortBy = 'createdAt' } = options;
      
      const comments = await Comment.getThreadedComments(postId, {
        limit,
        skip,
        sortBy,
      });

      return comments;
    } catch (error) {
      console.error('Error getting comments:', error);
      throw error;
    }
  }

  /**
   * Update a comment
   */
  async updateComment(commentId, content, userId) {
    try {
      const comment = await Comment.findById(commentId);
      
      if (!comment) {
        throw new Error('Comment not found');
      }

      if (comment.authorId.toString() !== userId.toString()) {
        throw new Error('Unauthorized to update this comment');
      }

      // Moderate updated content
      const moderationResult = this.moderateContent(content);

      comment.edit(content);
      if (moderationResult.isFlagged) {
        comment.status = COMMENT_STATUS.FLAGGED;
        comment.moderationFlags.push(...moderationResult.flags);
      }

      await comment.save();

      return {
        success: true,
        comment: await Comment.findById(commentId)
          .populate('authorId', 'name avatar')
          .lean(),
        moderation: moderationResult,
      };
    } catch (error) {
      console.error('Error updating comment:', error);
      throw error;
    }
  }

  /**
   * Delete a comment
   */
  async deleteComment(commentId, userId, isAdmin = false) {
    try {
      const comment = await Comment.findById(commentId);
      
      if (!comment) {
        throw new Error('Comment not found');
      }

      if (!isAdmin && comment.authorId.toString() !== userId.toString()) {
        throw new Error('Unauthorized to delete this comment');
      }

      await Comment.findByIdAndUpdate(commentId, {
        status: COMMENT_STATUS.REMOVED,
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw error;
    }
  }

  /**
   * Like/unlike a comment
   */
  async toggleCommentLike(commentId, userId) {
    try {
      const comment = await Comment.findById(commentId);
      
      if (!comment) {
        throw new Error('Comment not found');
      }

      const isLiked = comment.isLikedBy(userId);

      if (isLiked) {
        comment.removeLike(userId);
      } else {
        comment.addLike(userId);
      }

      await comment.save();

      return {
        success: true,
        isLiked: !isLiked,
        likeCount: comment.likeCount,
      };
    } catch (error) {
      console.error('Error toggling comment like:', error);
      throw error;
    }
  }

  /**
   * Mark comment as accepted answer
   */
  async acceptAnswer(commentId, userId) {
    try {
      const comment = await Comment.findById(commentId);
      
      if (!comment) {
        throw new Error('Comment not found');
      }

      // Get post to verify ownership
      const post = await CommunityPost.findById(comment.postId);
      if (post.authorId.toString() !== userId.toString()) {
        throw new Error('Only post author can accept answers');
      }

      // Unmark any existing accepted answer
      await Comment.updateMany(
        { postId: comment.postId, isAcceptedAnswer: true },
        { isAcceptedAnswer: false }
      );

      // Mark this as accepted
      comment.markAsAccepted();
      await comment.save();

      // Notify comment author
      await this.notificationService.create({
        userId: comment.authorId,
        type: 'answer_accepted',
        title: 'Your Answer Was Accepted!',
        message: 'Your answer was marked as the solution',
        data: { postId: comment.postId, commentId },
      });

      return { success: true };
    } catch (error) {
      console.error('Error accepting answer:', error);
      throw error;
    }
  }

  // ==================== GROUP MANAGEMENT ====================

  /**
   * Create a new community group
   */
  async createGroup(groupData, creatorId) {
    try {
      const group = new CommunityGroup({
        ...groupData,
        creatorId,
        members: [{ userId: creatorId, role: MEMBER_ROLES.ADMIN }],
      });

      await group.save();

      return {
        success: true,
        group: await CommunityGroup.findById(group._id)
          .populate('creatorId', 'name avatar')
          .lean(),
      };
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    }
  }

  /**
   * Get group by ID
   */
  async getGroupById(groupId, userId = null) {
    try {
      const group = await CommunityGroup.findById(groupId)
        .populate('creatorId', 'name avatar')
        .populate('members.userId', 'name avatar')
        .populate('moderators.userId', 'name avatar');

      if (!group) {
        throw new Error('Group not found');
      }

      const isMember = userId ? group.isMember(userId) : false;
      const isModerator = userId ? group.isModerator(userId) : false;
      const isAdmin = userId ? group.isAdmin(userId) : false;

      return {
        ...group.toObject(),
        isMember,
        isModerator,
        isAdmin,
      };
    } catch (error) {
      console.error('Error getting group:', error);
      throw error;
    }
  }

  /**
   * Join a group
   */
  async joinGroup(groupId, userId) {
    try {
      const group = await CommunityGroup.findById(groupId);
      
      if (!group) {
        throw new Error('Group not found');
      }

      if (group.isMember(userId)) {
        throw new Error('Already a member of this group');
      }

      if (group.isPrivate || group.requiresApproval) {
        // Add to membership requests
        group.requestMembership(userId);
        await group.save();

        // Notify group admins
        await this.notifyGroupAdmins(groupId, 'membership_request', { userId });

        return {
          success: true,
          message: 'Membership request sent',
          requiresApproval: true,
        };
      }

      // Direct join for public groups
      group.addMember(userId);
      await group.save();

      // Update user profile
      await PublicProfile.updateOne(
        { userId },
        { $inc: { 'statistics.groupsJoined': 1 } }
      );

      return {
        success: true,
        message: 'Successfully joined group',
        requiresApproval: false,
      };
    } catch (error) {
      console.error('Error joining group:', error);
      throw error;
    }
  }

  /**
   * Leave a group
   */
  async leaveGroup(groupId, userId) {
    try {
      const group = await CommunityGroup.findById(groupId);
      
      if (!group) {
        throw new Error('Group not found');
      }

      if (!group.isMember(userId)) {
        throw new Error('Not a member of this group');
      }

      // Cannot leave if you're the creator
      if (group.creatorId.toString() === userId.toString()) {
        throw new Error('Group creator cannot leave. Transfer ownership or delete the group.');
      }

      group.removeMember(userId);
      await group.save();

      // Update user profile
      await PublicProfile.updateOne(
        { userId },
        { $inc: { 'statistics.groupsJoined': -1 } }
      );

      return { success: true };
    } catch (error) {
      console.error('Error leaving group:', error);
      throw error;
    }
  }

  // ==================== FEED GENERATION ====================

  /**
   * Get personalized feed for user
   */
  async getPersonalizedFeed(userId, options = {}) {
    try {
      const { limit = 20, skip = 0 } = options;

      // Get user's interests from profile
      const profile = await PublicProfile.findOne({ userId });
      const interests = profile?.expertise || [];

      // Get user's group memberships
      const userGroups = await CommunityGroup.find({
        'members.userId': userId,
      }).select('_id');
      const groupIds = userGroups.map(g => g._id);

      // Build feed query
      const feedQuery = {
        status: POST_STATUS.ACTIVE,
        $or: [
          { category: { $in: interests } },
          { tags: { $in: interests } },
          { groupId: { $in: groupIds } },
        ],
      };

      const posts = await CommunityPost.find(feedQuery)
        .sort({ isPinned: -1, engagementScore: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('authorId', 'name avatar companyName displayName')
        .populate('groupId', 'name slug')
        .lean();

      // Enrich posts with user-specific data
      const enrichedPosts = posts.map(post => ({
        ...post,
        isLiked: post.likes?.some(l => l.userId.toString() === userId.toString()),
        likeCount: post.likes?.length || 0,
        commentCount: post.comments?.length || 0,
      }));

      return enrichedPosts;
    } catch (error) {
      console.error('Error getting personalized feed:', error);
      throw error;
    }
  }

  /**
   * Get trending posts
   */
  async getTrending(category = null, limit = 10) {
    try {
      return await CommunityPost.getTrending(limit, category);
    } catch (error) {
      console.error('Error getting trending posts:', error);
      throw error;
    }
  }

  /**
   * Get posts by category
   */
  async getPostsByCategory(category, options = {}) {
    try {
      const { limit = 20, skip = 0 } = options;

      const posts = await CommunityPost.find({
        category,
        status: POST_STATUS.ACTIVE,
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('authorId', 'name avatar companyName displayName')
        .lean();

      return posts;
    } catch (error) {
      console.error('Error getting posts by category:', error);
      throw error;
    }
  }

  // ==================== SEARCH ====================

  /**
   * Search posts and groups
   */
  async search(query, options = {}) {
    try {
      const { limit = 20, skip = 0, type = 'all' } = options;

      const results = {
        posts: [],
        groups: [],
      };

      if (type === 'all' || type === 'posts') {
        results.posts = await CommunityPost.find(
          {
            status: POST_STATUS.ACTIVE,
            $text: { $search: query },
          },
          { score: { $meta: 'textScore' } }
        )
          .sort({ score: { $meta: 'textScore' } })
          .skip(skip)
          .limit(limit)
          .populate('authorId', 'name avatar')
          .lean();
      }

      if (type === 'all' || type === 'groups') {
        results.groups = await CommunityGroup.search(query, { limit, skip });
      }

      return results;
    } catch (error) {
      console.error('Error searching:', error);
      throw error;
    }
  }

  // ==================== CONTENT MODERATION ====================

  /**
   * Moderate content for inappropriate material
   */
  moderateContent(content) {
    const flags = [];
    let isFlagged = false;

    for (const [category, patterns] of Object.entries(MODERATION_PATTERNS)) {
      for (const pattern of patterns) {
        const matches = content.match(pattern);
        if (matches) {
          isFlagged = true;
          flags.push({
            reason: `Detected ${category}`,
            flaggedBy: 'auto',
            details: { matches: matches.slice(0, 5) }, // Limit matches stored
          });
        }
      }
    }

    return {
      isFlagged,
      flags,
    };
  }

  /**
   * Flag content for manual review
   */
  async flagContent(contentId, contentType, reason, flaggedBy, details = {}) {
    try {
      const Model = contentType === 'post' ? CommunityPost : Comment;
      
      await Model.findByIdAndUpdate(contentId, {
        $push: {
          moderationFlags: {
            reason,
            flaggedBy,
            flaggedAt: new Date(),
            details,
          },
        },
        $set: {
          status: 'flagged',
        },
      });

      return { success: true };
    } catch (error) {
      console.error('Error flagging content:', error);
      throw error;
    }
  }

  /**
   * Approve flagged content
   */
  async approveContent(contentId, contentType) {
    try {
      const Model = contentType === 'post' ? CommunityPost : Comment;
      const statusField = contentType === 'post' ? POST_STATUS.ACTIVE : COMMENT_STATUS.ACTIVE;
      
      await Model.findByIdAndUpdate(contentId, {
        status: statusField,
      });

      return { success: true };
    } catch (error) {
      console.error('Error approving content:', error);
      throw error;
    }
  }

  /**
   * Remove content (admin action)
   */
  async removeContent(contentId, contentType, reason) {
    try {
      const Model = contentType === 'post' ? CommunityPost : Comment;
      const statusField = contentType === 'post' ? POST_STATUS.REMOVED : COMMENT_STATUS.REMOVED;
      
      await Model.findByIdAndUpdate(contentId, {
        status: statusField,
        $push: {
          moderationFlags: {
            reason,
            flaggedBy: 'admin',
            flaggedAt: new Date(),
          },
        },
      });

      return { success: true };
    } catch (error) {
      console.error('Error removing content:', error);
      throw error;
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Extract @mentions from content
   */
  extractMentions(content) {
    const mentionPattern = /@(\w+)/g;
    const mentions = [];
    let match;

    while ((match = mentionPattern.exec(content)) !== null) {
      mentions.push({
        username: match[1],
      });
    }

    return mentions;
  }

  /**
   * Notify group members of new post
   */
  async notifyGroupMembers(groupId, postId, excludeUserId) {
    try {
      const group = await CommunityGroup.findById(groupId);
      if (!group) return;

      for (const member of group.members) {
        if (member.userId.toString() === excludeUserId.toString()) continue;
        if (!member.notificationsEnabled) continue;

        await this.notificationService.create({
          userId: member.userId,
          type: 'group_post',
          title: `New Post in ${group.name}`,
          message: 'A new post was published in a group you\'re a member of',
          data: { groupId, postId },
        });
      }
    } catch (error) {
      console.error('Error notifying group members:', error);
    }
  }

  /**
   * Notify group admins
   */
  async notifyGroupAdmins(groupId, type, data) {
    try {
      const group = await CommunityGroup.findById(groupId);
      if (!group) return;

      const admins = group.members.filter(m => m.role === MEMBER_ROLES.ADMIN);

      for (const admin of admins) {
        await this.notificationService.create({
          userId: admin.userId,
          type,
          title: type === 'membership_request' ? 'New Membership Request' : 'Group Update',
          message: type === 'membership_request' 
            ? 'Someone requested to join your group'
            : 'There is an update in your group',
          data: { groupId, ...data },
        });
      }
    } catch (error) {
      console.error('Error notifying group admins:', error);
    }
  }
}

export default CommunityService;