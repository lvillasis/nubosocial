import { motion, AnimatePresence } from "framer-motion";
import PostDetail from "./PostDetail";

interface PostDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: any;
}

export default function PostDetailModal({ isOpen, onClose, post }: PostDetailModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
          >
            <PostDetail post={post} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
