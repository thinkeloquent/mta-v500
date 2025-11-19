import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createPrismaClientFactory,
  initializePrismaClient,
  validateDatabaseConfig,
} from './prisma-factory';

describe('validateDatabaseConfig', () => {
  describe('validation errors', () => {
    it('should return error when no database URL is provided', () => {
      const result = validateDatabaseConfig();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Database URL is required (provide via databaseUrl option or DATABASE_URL env var)',
      );
    });

    it('should return error for unknown database type', () => {
      const result = validateDatabaseConfig('unknown://localhost/db');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Unknown database type in URL: unknown');
    });
  });

  describe('PostgreSQL validation', () => {
    it('should validate correct PostgreSQL URL', () => {
      const result = validateDatabaseConfig('postgresql://user:pass@localhost:5432/mydb');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.databaseType).toBe('postgresql');
    });

    it('should validate postgres:// protocol', () => {
      const result = validateDatabaseConfig('postgres://user:pass@localhost:5432/mydb');
      expect(result.valid).toBe(true);
      expect(result.databaseType).toBe('postgresql');
    });

    it('should return error when PostgreSQL URL missing credentials', () => {
      const result = validateDatabaseConfig('postgresql://localhost:5432/mydb');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('PostgreSQL URL must include credentials (user@host)');
    });

    it('should return error when PostgreSQL URL missing database name', () => {
      const result = validateDatabaseConfig('postgresql://user@localhost');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('PostgreSQL URL must include database name');
    });
  });

  describe('MySQL validation', () => {
    it('should validate correct MySQL URL', () => {
      const result = validateDatabaseConfig('mysql://user:pass@localhost:3306/mydb');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.databaseType).toBe('mysql');
    });
  });

  describe('SQLite validation', () => {
    it('should validate SQLite file URL', () => {
      const result = validateDatabaseConfig('file:./dev.db');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.databaseType).toBe('sqlite');
    });

    it('should validate SQLite .db file path', () => {
      const result = validateDatabaseConfig('./database.db');
      expect(result.valid).toBe(true);
      expect(result.databaseType).toBe('sqlite');
    });

    it('should return error for empty file URL', () => {
      const result = validateDatabaseConfig('file:');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('SQLite URL must include file path');
    });
  });

  describe('MongoDB validation', () => {
    it('should validate MongoDB URL', () => {
      const result = validateDatabaseConfig('mongodb://localhost:27017/mydb');
      expect(result.valid).toBe(true);
      expect(result.databaseType).toBe('mongodb');
    });

    it('should validate MongoDB SRV URL', () => {
      const result = validateDatabaseConfig('mongodb+srv://cluster.mongodb.net/mydb');
      expect(result.valid).toBe(true);
      expect(result.databaseType).toBe('mongodb');
    });
  });

  describe('SQL Server validation', () => {
    it('should validate SQL Server URL', () => {
      const result = validateDatabaseConfig('sqlserver://localhost:1433;database=mydb');
      expect(result.valid).toBe(true);
      expect(result.databaseType).toBe('sqlserver');
    });
  });
});

describe('initializePrismaClient', () => {
  // Mock Prisma client
  class MockPrismaClient {
    $connect = vi.fn().mockResolvedValue(undefined);
    $disconnect = vi.fn().mockResolvedValue(undefined);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize Prisma client with valid database URL', async () => {
      const result = await initializePrismaClient(MockPrismaClient, {
        databaseUrl: 'postgresql://user:pass@localhost:5432/mydb',
      });

      expect(result.client).toBeInstanceOf(MockPrismaClient);
      expect(result.client.$connect).toHaveBeenCalledTimes(1);
      expect(result.disconnect).toBeDefined();
      expect(result.reconnect).toBeDefined();
      expect(result.isConnected).toBeDefined();
      expect(result.isConnected()).toBe(true);
    });

    it('should use DATABASE_URL from environment if not provided', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/envdb';
      const result = await initializePrismaClient(MockPrismaClient);

      expect(result.client).toBeInstanceOf(MockPrismaClient);
      expect(result.client.$connect).toHaveBeenCalledTimes(1);
    });

    it('should throw error when no database URL is provided', async () => {
      await expect(initializePrismaClient(MockPrismaClient)).rejects.toThrow(
        'Prisma client initialization failed',
      );
    });

    it('should throw error with invalid database URL', async () => {
      await expect(
        initializePrismaClient(MockPrismaClient, {
          databaseUrl: 'invalid://url',
        }),
      ).rejects.toThrow('Prisma client initialization failed');
    });
  });

  describe('connection options', () => {
    it('should not auto-connect when autoConnect is false', async () => {
      const result = await initializePrismaClient(MockPrismaClient, {
        databaseUrl: 'postgresql://user:pass@localhost:5432/mydb',
        autoConnect: false,
      });

      expect(result.client.$connect).not.toHaveBeenCalled();
      expect(result.isConnected()).toBe(false);
    });

    it('should handle connection failure when autoConnect is true', async () => {
      class FailingMockClient extends MockPrismaClient {
        $connect = vi.fn().mockRejectedValue(new Error('Connection failed'));
      }

      await expect(
        initializePrismaClient(FailingMockClient, {
          databaseUrl: 'postgresql://user:pass@localhost:5432/mydb',
        }),
      ).rejects.toThrow('Failed to connect to database: Connection failed');
    });
  });

  describe('logging options', () => {
    it('should configure default log levels (error, warn)', async () => {
      const result = await initializePrismaClient(MockPrismaClient, {
        databaseUrl: 'postgresql://user:pass@localhost:5432/mydb',
      });

      expect(result.client).toBeDefined();
    });

    it('should enable query logging when enableQueryLogging is true', async () => {
      const result = await initializePrismaClient(MockPrismaClient, {
        databaseUrl: 'postgresql://user:pass@localhost:5432/mydb',
        enableQueryLogging: true,
      });

      expect(result.client).toBeDefined();
    });

    it('should enable info logging when enableInfoLogging is true', async () => {
      const result = await initializePrismaClient(MockPrismaClient, {
        databaseUrl: 'postgresql://user:pass@localhost:5432/mydb',
        enableInfoLogging: true,
      });

      expect(result.client).toBeDefined();
    });

    it('should use custom log levels when provided', async () => {
      const result = await initializePrismaClient(MockPrismaClient, {
        databaseUrl: 'postgresql://user:pass@localhost:5432/mydb',
        logLevels: ['query', 'error'],
      });

      expect(result.client).toBeDefined();
    });
  });

  describe('connection management', () => {
    it('should disconnect from database', async () => {
      const result = await initializePrismaClient(MockPrismaClient, {
        databaseUrl: 'postgresql://user:pass@localhost:5432/mydb',
      });

      expect(result.isConnected()).toBe(true);
      await result.disconnect();
      expect(result.client.$disconnect).toHaveBeenCalledTimes(1);
      expect(result.isConnected()).toBe(false);
    });

    it('should not disconnect if not connected', async () => {
      const result = await initializePrismaClient(MockPrismaClient, {
        databaseUrl: 'postgresql://user:pass@localhost:5432/mydb',
        autoConnect: false,
      });

      await result.disconnect();
      expect(result.client.$disconnect).not.toHaveBeenCalled();
    });

    it('should reconnect to database', async () => {
      const result = await initializePrismaClient(MockPrismaClient, {
        databaseUrl: 'postgresql://user:pass@localhost:5432/mydb',
      });

      expect(result.client.$connect).toHaveBeenCalledTimes(1);
      await result.reconnect();
      expect(result.client.$disconnect).toHaveBeenCalledTimes(1);
      expect(result.client.$connect).toHaveBeenCalledTimes(2);
      expect(result.isConnected()).toBe(true);
    });

    it('should connect when reconnecting from disconnected state', async () => {
      const result = await initializePrismaClient(MockPrismaClient, {
        databaseUrl: 'postgresql://user:pass@localhost:5432/mydb',
        autoConnect: false,
      });

      expect(result.isConnected()).toBe(false);
      await result.reconnect();
      expect(result.client.$connect).toHaveBeenCalledTimes(1);
      expect(result.isConnected()).toBe(true);
    });
  });
});

describe('createPrismaClientFactory', () => {
  class MockPrismaClient {
    $connect = vi.fn().mockResolvedValue(undefined);
    $disconnect = vi.fn().mockResolvedValue(undefined);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create a factory function', () => {
    const factory = createPrismaClientFactory(MockPrismaClient);
    expect(typeof factory).toBe('function');
  });

  it('should create client with default options', async () => {
    const factory = createPrismaClientFactory(MockPrismaClient, {
      databaseUrl: 'postgresql://user:pass@localhost:5432/mydb',
      enableQueryLogging: true,
    });

    const result = await factory();
    expect(result.client).toBeInstanceOf(MockPrismaClient);
    expect(result.client.$connect).toHaveBeenCalledTimes(1);
  });

  it('should override default options', async () => {
    const factory = createPrismaClientFactory(MockPrismaClient, {
      databaseUrl: 'postgresql://user:pass@localhost:5432/default',
      enableQueryLogging: false,
    });

    const result = await factory({
      databaseUrl: 'postgresql://user:pass@localhost:5432/override',
      enableQueryLogging: true,
    });

    expect(result.client).toBeInstanceOf(MockPrismaClient);
    expect(result.client.$connect).toHaveBeenCalledTimes(1);
  });

  it('should merge options correctly', async () => {
    const factory = createPrismaClientFactory(MockPrismaClient, {
      enableQueryLogging: true,
      autoConnect: true,
    });

    const result = await factory({
      databaseUrl: 'postgresql://user:pass@localhost:5432/mydb',
      enableInfoLogging: true,
    });

    expect(result.client).toBeInstanceOf(MockPrismaClient);
    expect(result.isConnected()).toBe(true);
  });

  it('should create multiple independent clients', async () => {
    const factory = createPrismaClientFactory(MockPrismaClient, {
      enableQueryLogging: true,
    });

    const result1 = await factory({
      databaseUrl: 'postgresql://user:pass@localhost:5432/db1',
    });
    const result2 = await factory({
      databaseUrl: 'postgresql://user:pass@localhost:5432/db2',
    });

    expect(result1.client).not.toBe(result2.client);
    expect(result1.client).toBeInstanceOf(MockPrismaClient);
    expect(result2.client).toBeInstanceOf(MockPrismaClient);
  });
});
