import { Controller, Post, UploadedFiles, UseInterceptors, Res, BadRequestException } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import archiver from 'archiver';
import sharp from 'sharp';

@Controller()
export class ConvertController {
  @Post('convert')
  @UseInterceptors(
    FilesInterceptor('files', 20, {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }
    })
  )
  async convert(@UploadedFiles() files: Express.Multer.File[], @Res() res: Response) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    const nonSvg = files.filter(
      (f) => f.mimetype !== 'image/svg+xml' && !f.originalname.toLowerCase().endsWith('.svg')
    );
    if (nonSvg.length > 0) {
      throw new BadRequestException('Only SVG files are allowed');
    }

    if (files.length === 1) {
      const file = files[0];
      const basename = file.originalname.replace(/\.svg$/i, '');
      const pngBuffer = await this.svgToPng(file.buffer);
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `attachment; filename="${basename}.png"`);
      return res.send(pngBuffer);
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="converted.zip"');

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('warning', (err) => {
      // eslint-disable-next-line no-console
      console.warn(err);
    });
    archive.on('error', (err) => {
      // eslint-disable-next-line no-console
      console.error(err);
      res.status(500).end();
    });

    archive.pipe(res);

    for (const file of files) {
      const basename = file.originalname.replace(/\.svg$/i, '');
      const pngBuffer = await this.svgToPng(file.buffer);
      archive.append(pngBuffer, { name: `${basename}.png` });
    }

    await archive.finalize();
  }

  private async svgToPng(buffer: Buffer): Promise<Buffer> {
    // Use higher density for crisper rendering when SVG doesn't specify size
    return sharp(buffer, { density: 300 }).png({ quality: 100 }).toBuffer();
  }
}


