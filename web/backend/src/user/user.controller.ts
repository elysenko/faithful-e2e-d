import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Auth, GetUser } from 'src/auth/decorators';
import { User } from './entities/user.entity';
import { Role } from '@prisma/client';

@ApiBearerAuth()
@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @ApiOperation({
    summary: 'GET CURRENT USER',
    description: 'Private endpoint to get the currently authenticated user data.',
  })
  @ApiResponse({ status: 200, description: 'Ok', type: User })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Auth(Role.admin, Role.user)
  getMe(@GetUser() user: User) {
    return this.userService.getMe(user);
  }

  @Post()
  @ApiOperation({
    summary: 'CREATE USER',
    description:
      'Private endpoint to Create a new User. It is allowed only by "admin" users, and allows the creation of users with "admin" Role.',
  })
  @ApiResponse({ status: 201, description: 'Created', type: User })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Server error' })
  @Auth(Role.admin)
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get()
  @ApiOperation({
    summary: 'GET ALL USERS',
    description: 'Private endpoint to list all Users. It is allowed only by "admin" users.',
  })
  @ApiResponse({ status: 200, description: 'Ok', type: User, isArray: true })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Server error' })
  @Auth(Role.admin)
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'GET USER BY ID',
    description: 'Private endpoint to get user data by a specific ID.',
  })
  @ApiResponse({ status: 200, description: 'Ok', type: User })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Server error' })
  @Auth(Role.admin, Role.user)
  findOne(@Param('id') id: string, @GetUser() user: User) {
    return this.userService.findOne('id', id, user);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'UPDATE USER BY ID',
    description: 'Private endpoint to update user data by Id.',
  })
  @ApiResponse({ status: 200, description: 'Ok', type: User })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Server error' })
  @Auth(Role.admin, Role.user)
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @GetUser() user: User) {
    return this.userService.update('id', id, updateUserDto, user);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'DELETE USER BY ID',
    description: 'Private endpoint to delete user by Id.',
  })
  @ApiOkResponse({ content: { 'application/json': { example: { message: 'User deleted' } } } })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Server error' })
  @Auth(Role.admin, Role.user)
  remove(@Param('id') id: string, @GetUser() user: User) {
    return this.userService.remove('id', id, user);
  }
}
