import ChatInterface from '@/components/ChatInterface';

export default function KrishnaPage() {
  return (
    <ChatInterface 
      title="Ask Krishna" 
      themeColor="krishna" 
      apiEndpoint="/api/chat/krishna"
      welcomeMessage="Pranam. I am here to share the timeless wisdom of the Bhagavad Gita and Vedic texts. What moral or ethical dilemma do you seek guidance on today?"
    />
  );
}
