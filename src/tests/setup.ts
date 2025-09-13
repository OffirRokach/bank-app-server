import { jest } from '@jest/globals';

// Mock prisma client
jest.mock('../services/databaseService', () => {
  const mockPrisma = {
    user: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    account: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn((callback: (prisma: any) => any) => callback(mockPrisma)),
  };
  
  return {
    __esModule: true,
    default: mockPrisma,
  };
});

// Mock repositories
jest.mock('../repositories/userRepository');
jest.mock('../repositories/accountRepository');
jest.mock('../repositories/transactionRepository');

// Mock utils
jest.mock('../utils/passwordUtils');
jest.mock('../utils/emailUtils', () => {
  return {
    sendVerificationEmail: jest.fn().mockImplementation(() => Promise.resolve())
  };
});
jest.mock('../utils/accountUtils');

// Mock nodemailer
jest.mock('nodemailer', () => {
  return {
    createTransport: jest.fn().mockReturnValue({
      sendMail: jest.fn().mockImplementation((mailOptions: any, callback?: any) => {
        if (callback) {
          callback(null, { messageId: 'test-message-id' });
        }
        return Promise.resolve({ messageId: 'test-message-id' });
      }),
    }),
  };
});

// Mock socket middleware
jest.mock('../middleware/socketMiddleware');

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'mock-token'),
  verify: jest.fn(() => ({ userId: 'mock-user-id', email: 'test@example.com' })),
}));

// Mock normalize-email
jest.mock('normalize-email', () => jest.fn((email) => email));

// Setup mock Express request and response
export const mockRequest = () => {
  const req: any = {};
  req.body = {};
  req.query = {};
  req.params = {};
  req.user = { userId: 'mock-user-id', email: 'test@example.com', firstName: 'Test' };
  req.app = { get: jest.fn() };
  return req;
};

export const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
