import './ChatBubble.css';

export function ChatBubble({ text }: { text: string }) {
  const time = new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="chat-bubble-frame">
      <div className="chat-bubble">
        <p className="chat-bubble__text">{text}</p>
        <span className="chat-bubble__meta">
          {time}
          <svg className="chat-bubble__check" viewBox="0 0 16 11" aria-hidden="true">
            <path
              d="M1 5.5 4.5 9 9 2.5M6.5 9 11 2.5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </span>
      </div>
    </div>
  );
}
