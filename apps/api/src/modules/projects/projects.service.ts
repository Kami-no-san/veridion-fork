import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { CacheService } from '../../common/cache/cache.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { CreateProjectDto, ProjectQueryDto, UpdateProjectDto } from './dto/project.dto';

type ProjectListResult = {
  data: unknown[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async create(userId: string, dto: CreateProjectDto) {
    const project = await this.prisma.db.project.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        repoUrl: dto.repoUrl ?? null,
        chain: dto.chain,
        language: dto.language,
        userId,
        organizationId: dto.organizationId ?? null,
      },
    });

    await this.cache.invalidateByPrefix(this.projectCachePrefix(userId));
    return project;
  }

  async findAll(userId: string, query: ProjectQueryDto): Promise<ProjectListResult> {
    const { page = 1, limit = 20, search } = query;
    const cacheKey = `${this.projectCachePrefix(userId)}${page}:${limit}:${search ?? ''}`;
    const cached = await this.cache.get<unknown>(cacheKey);
    if (cached !== null) return cached as ProjectListResult;

    const where = {
      userId,
      ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.db.project.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { audits: true, contracts: true } } },
      }),
      this.prisma.db.project.count({ where }),
    ]);

    const result = {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    };

    await this.cache.set(cacheKey, result, this.cache.getTtl('projects'));
    return result;
  }

  async findOne(id: string, userId: string): Promise<unknown> {
    const cacheKey = `project:${userId}:${id}`;
    const cached = await this.cache.get<unknown>(cacheKey);
    if (cached !== null) return cached;

    const project = await this.prisma.db.project.findUnique({
      where: { id },
      include: { _count: { select: { audits: true, contracts: true } } },
    });

    if (!project) throw new NotFoundException('Project not found');
    if (project.userId !== userId) throw new ForbiddenException('Access denied');

    await this.cache.set(cacheKey, project, this.cache.getTtl('projects'));
    return project;
  }

  async update(id: string, userId: string, dto: UpdateProjectDto) {
    await this.findOne(id, userId);

    const project = await this.prisma.db.project.update({
      where: { id },
      data: dto,
    });

    await this.cache.invalidate(`project:${userId}:${id}`);
    await this.cache.invalidateByPrefix(this.projectCachePrefix(userId));
    return project;
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    await this.prisma.db.project.delete({ where: { id } });
    await this.cache.invalidate(`project:${userId}:${id}`);
    await this.cache.invalidateByPrefix(this.projectCachePrefix(userId));
    return { message: 'Project deleted' };
  }

  private projectCachePrefix(userId: string): string {
    return `projects:${userId}:`;
  }
}
