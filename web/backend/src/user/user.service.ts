import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';

import * as bcrypt from 'bcryptjs';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { User } from './entities/user.entity';
import { Role } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Injectable()
export class UserService {
  private readonly logger = new Logger('UserService');

  constructor(private prisma: PrismaService) {}

  async getMe(user: User): Promise<User> {
    return user;
  }

  async create(dto: CreateUserDto) {
    this.logger.log(`POST: user/register: Register user started`);

    if (dto.password !== dto.passwordconf) throw new BadRequestException('Passwords do not match');

    if (dto.role && !Role[dto.role]) throw new BadRequestException('Invalid role');

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

      return newuser;
    } catch (error) {
      this.prismaErrorHandler(error, 'POST', dto.email);
      this.logger.error(`POST: error: ${error}`);
      throw new InternalServerErrorException('Server error');
    }
  }

  async findAll() {
    try {
      const users = await this.prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return users;
    } catch (error) {
      this.logger.error(`GET: error: ${error}`);
      throw new InternalServerErrorException('Server error');
    }
  }

  async findOne(field: string, value: string, user: User) {
    if (value !== (user as any)[field] && user.role !== 'admin')
      throw new UnauthorizedException('Unauthorized');

    const whereData = field === 'id' ? { id: value } : { email: value };

    try {
      const foundUser = await this.prisma.user.findUniqueOrThrow({
        where: whereData,
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return foundUser;
    } catch (error) {
      this.prismaErrorHandler(error, 'GET', value);
      this.logger.error(`GET/{id}: error: ${error}`);
      throw new InternalServerErrorException('Server error');
    }
  }

  async update(field: string, value: string, dto: UpdateUserDto, user: User) {
    if (value !== (user as any)[field] && user.role !== 'admin')
      throw new UnauthorizedException('Unauthorized');

    const whereData = field === 'id' ? { id: value } : { email: value };

    if (user.role !== 'admin') delete dto.role;

    const { passwordconf, ...newUserData } = dto;
    void passwordconf;

    if (dto.password) {
      if (dto.password !== passwordconf) throw new BadRequestException('Passwords do not match');
      newUserData.password = await bcrypt.hash(dto.password, 10);
    }

    try {
      const updatedUser = await this.prisma.user.update({
        where: whereData,
        data: newUserData,
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return updatedUser;
    } catch (error) {
      this.prismaErrorHandler(error, 'PATCH', value);
      this.logger.error(`PATCH: error: ${error}`);
      throw new InternalServerErrorException('Server error');
    }
  }

  async remove(field: string, value: string, user: User) {
    if (value !== (user as any)[field] && user.role !== 'admin')
      throw new UnauthorizedException('Unauthorized');

    const whereData = field === 'id' ? { id: value } : { email: value };

    try {
      const deletedUser = await this.prisma.user.delete({
        where: whereData,
        select: {
          id: true,
          email: true,
          name: true,
        },
      });

      this.logger.warn(`DELETE: ${JSON.stringify(deletedUser)}`);
      return { message: 'User deleted' };
    } catch (error) {
      this.prismaErrorHandler(error, 'DELETE', value);
      this.logger.error(`DELETE: error: ${JSON.stringify((error as Error).toString())}`);
      throw new InternalServerErrorException('Server error');
    }
  }

  prismaErrorHandler = (error: any, method: string, value: string | null = null) => {
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
      this.logger.warn(`${method}: User already exists: ${value}`);
      throw new BadRequestException('User already exists');
    }
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') {
      this.logger.warn(`${method}: User not found: ${value}`);
      throw new BadRequestException('User not found');
    }
  };
}
