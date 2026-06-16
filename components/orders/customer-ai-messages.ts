export type CustomerAiSuggestedProduct = {
  id: number;
  categoryName: string;
  imageUrl: string | null;
  name: string;
  price: number;
};

export type CustomerAiMessage = {
  id: number;
  role: "assistant" | "user";
  content: string;
  suggestedProducts?: CustomerAiSuggestedProduct[];
};

export function appendCustomerAiMessage(
  messages: CustomerAiMessage[],
  message: Omit<CustomerAiMessage, "id">,
): CustomerAiMessage[] {
  const nextId =
    messages.reduce((maxId, currentMessage) => {
      return Math.max(maxId, currentMessage.id);
    }, 0) + 1;

  return [
    ...messages,
    {
      ...message,
      id: nextId,
    },
  ];
}
