export const askAssistantSchema = {
  body: {
    type: 'object',
    required: ['question'],
    properties: {
      question: { type: 'string', minLength: 1, maxLength: 500 },
    },
  },
}

export interface AskAssistantBody {
  question: string
}
