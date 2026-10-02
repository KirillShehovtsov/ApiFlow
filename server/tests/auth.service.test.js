import { jest } from '@jest/globals';
import bcrypt from 'bcryptjs';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

jest.unstable_mockModule('../src/config/db.js', () => ({
  default: mockPrisma,
}));

const { register, login } = await import('../src/services/auth.service.js');

beforeAll(() => {
  process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests';
  process.env.JWT_EXPIRES_IN = '1h';
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('auth.service', () => {
  test('register duplicate email', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 1, email: 'taken@test.com' });

    await expect(
      register({ name: 'A', email: 'taken@test.com', password: 'Pass123!' })
    ).rejects.toMatchObject({ message: 'Email already in use', status: 409 });

    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  test('register success', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: 10,
      name: 'Demo',
      email: 'demo@test.com',
      passwordHash: 'hash',
    });

    const result = await register({
      name: 'Demo',
      email: 'demo@test.com',
      password: 'Pass123!',
    });

    expect(result.token).toBeTruthy();
    expect(result.user).toEqual({ id: 10, name: 'Demo', email: 'demo@test.com' });
    expect(mockPrisma.user.create).toHaveBeenCalled();
  });

  test('login wrong password', async () => {
    const hash = await bcrypt.hash('CorrectPass1!', 10);
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 2,
      email: 'user@test.com',
      passwordHash: hash,
    });

    await expect(
      login({ email: 'user@test.com', password: 'WrongPass1!' })
    ).rejects.toMatchObject({ message: 'Invalid credentials', status: 401 });
  });

  test('login unknown email', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(
      login({ email: 'missing@test.com', password: 'AnyPass1!' })
    ).rejects.toMatchObject({ message: 'Invalid credentials', status: 401 });
  });
});
