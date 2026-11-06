import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TutorChat } from '../chat/TutorChat';

/** Full-screen tutor chat, opened from the Chat tab. */
export function TutorScreen() {
  const navigate = useNavigate();
  return (
    <TutorChat
      closeButton={
        <button type="button" className="icon-button" aria-label="Back to Chat" onClick={() => navigate('/chat')}>
          <ChevronLeft size={26} />
        </button>
      }
    />
  );
}
