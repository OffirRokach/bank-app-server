import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import { getTransactions, transferFunds } from '../controllers/transactionsController';
import { mockRequest, mockResponse } from './setup';
import { 
  getAccountTransactions, 
  findAccountByIdAndUser, 
  findAccountByNumber, 
  transferFunds as executeTransfer 
} from '../repositories/transactionRepository';
import { notifyMoneyTransfer, isUserConnected } from '../middleware/socketMiddleware';
import { HTTP_STATUS } from '../constants/httpStatusCodes';
import { Decimal } from 'decimal.js';

// Mock the repository functions
jest.mocked(getAccountTransactions);
jest.mocked(findAccountByIdAndUser);
jest.mocked(findAccountByNumber);
jest.mocked(executeTransfer);
jest.mocked(notifyMoneyTransfer);
jest.mocked(isUserConnected);

describe('Transactions Controller', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    jest.clearAllMocks();
  });

  describe('getTransactions', () => {
    beforeEach(() => {
      req.query = { accountId: 'account-id' };
    });

    test('should return transactions for a specific account', async () => {
      const mockAccount = { 
        id: 'account-id', 
        accountNumber: '123456789',
        defaultAccount: true
      };
      
      const mockTransactions = [
        { id: 'tx-1', amount: 100, description: 'Test transaction 1' },
        { id: 'tx-2', amount: -50, description: 'Test transaction 2' }
      ];
      
      jest.mocked(findAccountByIdAndUser).mockResolvedValue(mockAccount as any);
      jest.mocked(getAccountTransactions).mockResolvedValue(mockTransactions as any);
      
      await getTransactions(req, res);
      
      expect(findAccountByIdAndUser).toHaveBeenCalledWith('account-id', 'mock-user-id');
      expect(getAccountTransactions).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Transactions retrieved successfully',
        data: expect.objectContaining({
          accountId: 'account-id',
          accountNumber: '123456789',
          transactions: mockTransactions
        })
      }));
    });

    test('should return error if accountId is missing', async () => {
      req.query = {};
      
      await getTransactions(req, res);
      
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Missing accountId in query'
      }));
    });

    test('should return error if account not found', async () => {
      jest.mocked(findAccountByIdAndUser).mockResolvedValue(null);
      
      await getTransactions(req, res);
      
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.NOT_FOUND);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Account not found or not owned'
      }));
    });

    test('should return error if user is not authenticated', async () => {
      req.user = undefined;
      
      await getTransactions(req, res);
      
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Authentication required'
      }));
    });
  });

  describe('transferFunds', () => {
    beforeEach(() => {
      req.body = {
        accountId: 'from-account-id',
        recipientAccountNumber: '987654321',
        amount: 100,
        description: 'Test transfer'
      };
      
      req.app.get.mockReturnValue('io-instance');
      
      const mockFromAccount = { 
        id: 'from-account-id', 
        accountNumber: '123456789',
        balance: new Decimal(500),
        user: {
          id: 'mock-user-id',
          firstName: 'John',
          lastName: 'Doe'
        }
      };
      
      const mockToAccount = { 
        id: 'to-account-id', 
        accountNumber: '987654321',
        user: {
          id: 'recipient-user-id',
          firstName: 'Jane',
          lastName: 'Smith'
        }
      };
      
      const mockTransaction = {
        id: 'tx-id',
        amount: new Decimal(100),
        description: 'Test transfer',
        fromAccount: mockFromAccount,
        toAccount: mockToAccount
      };
      
      jest.mocked(findAccountByIdAndUser).mockResolvedValue(mockFromAccount as any);
      jest.mocked(findAccountByNumber).mockResolvedValue(mockToAccount as any);
      jest.mocked(executeTransfer).mockResolvedValue({ transaction: mockTransaction } as any);
      jest.mocked(isUserConnected).mockReturnValue(true);
    });

    test('should transfer funds successfully', async () => {
      await transferFunds(req, res);
      
      expect(findAccountByIdAndUser).toHaveBeenCalledWith('from-account-id', 'mock-user-id');
      expect(findAccountByNumber).toHaveBeenCalledWith('987654321');
      expect(executeTransfer).toHaveBeenCalled();
      expect(notifyMoneyTransfer).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.CREATED);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Transfer completed successfully'
      }));
    });

    test('should return error if required fields are missing', async () => {
      req.body = { accountId: 'from-account-id' }; // Missing recipient and amount
      
      await transferFunds(req, res);
      
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: expect.stringContaining('Missing required fields')
      }));
    });

    test('should return error if source account not found', async () => {
      jest.mocked(findAccountByIdAndUser).mockResolvedValue(null);
      
      await transferFunds(req, res);
      
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.NOT_FOUND);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Source account not found or unauthorized'
      }));
    });

    test('should return error if transferring to same account', async () => {
      const mockAccount = { 
        id: 'from-account-id', 
        accountNumber: '987654321', // Same as recipient number
        balance: new Decimal(500)
      };
      
      jest.mocked(findAccountByIdAndUser).mockResolvedValue(mockAccount as any);
      
      await transferFunds(req, res);
      
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Source and recipient accounts cannot be the same'
      }));
    });

    test('should return error if insufficient funds', async () => {
      const mockAccount = { 
        id: 'from-account-id', 
        accountNumber: '123456789',
        balance: new Decimal(50) // Less than transfer amount
      };
      
      jest.mocked(findAccountByIdAndUser).mockResolvedValue(mockAccount as any);
      
      await transferFunds(req, res);
      
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Insufficient funds'
      }));
    });

    test('should return error if recipient account not found', async () => {
      jest.mocked(findAccountByNumber).mockResolvedValue(null);
      
      await transferFunds(req, res);
      
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.NOT_FOUND);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Recipient account not found'
      }));
    });

    test('should handle transfer without notification if recipient not connected', async () => {
      jest.mocked(isUserConnected).mockReturnValue(false);
      
      await transferFunds(req, res);
      
      expect(executeTransfer).toHaveBeenCalled();
      expect(notifyMoneyTransfer).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.CREATED);
    });
  });
});
