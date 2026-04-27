import { CommentPlugin } from '@platejs/comment/react'
import { CommentLeaf } from '@/components/ui/comment-node'

export const commentPlugin = CommentPlugin.configure({
  options: {
    commentingBlock: null as any,
  },
}).withComponent(CommentLeaf)
