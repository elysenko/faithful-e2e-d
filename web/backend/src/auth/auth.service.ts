import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import * as bcrypt from 'bcryptjs';

import { RegisterUserDto } from './dto/register-user.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { PrismaService } from 'src/prisma/prisma.service';
import { User } from 'src/user/entities/user.entity';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Injectable()
export class AuthService {
  private readonly logger = new Logger('AuthService');

  constructor(
    private prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async registerUser(dto: RegisterUserDto): Promise<any> {
    this.logger.log(`POST: auth/register: Register user started`);

    if (dto.password !== dto.passwordconf) throw new BadRequestException('Passwords do not match');

    dto.email = dto.email.toLowerCase().trim();

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    try {
      const { passwordconf, ...newUserData } = dto;
      void passwordconf;
      newUserData.password = hashedPassword;

      const newuser = await this.prisma.user.create({
        data: newUserData,
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          createdAt: true,
        },
      });

      return {
        user: newuser,
        token: this.getJwtToken({ id: newuser.id }),
      };
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
        this.logger.warn(`POST: auth/register: User already exists: ${dto.email}`);
        throw new BadRequestException('User already exists');
      }
      this.logger.error(`POST: auth/register: error: ${JSON.stringify(error)}`);
      throw new InternalServerErrorException('Server error');
    }
  }

  async loginUser(email: string, password: string): Promise<any> {
    this.logger.log(`POST: auth/login: Login started: ${email}`);
    let user: any;
    try {
      user = await this.prisma.user.findUniqueOrThrow({
        where: { email },
        select: {
          id: true,
          name: true,
          email: true,
          password: true,
          image: true,
          role: true,
          createdAt: true,
        },
      });
    } catch {
      throw new BadRequestException('Wrong credentials');
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      throw new BadRequestException('Wrong credentials');
    }

    delete user.password;

    this.logger.log(`POST: auth/login: User accepted: ${user.email}`);
    return {
      user,
      token: this.getJwtToken({ id: user.id }),
    };
  }

  async refreshToken(user: User) {
    return {
      user: user,
      token: this.getJwtToken({ id: user.id }),
    };
  }

  private getJwtToken(payload: JwtPayload) {
    const token = this.jwtService.sign(payload);
    return token;
  }
}
