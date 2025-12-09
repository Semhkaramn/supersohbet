import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { prisma } from '@/lib/prisma';

// Cloudinary ayarlarını database'den al
async function getCloudinaryConfig() {
  const settings = await prisma.settings.findMany({
    where: {
      key: {
        in: ['cloudinary_cloud_name', 'cloudinary_api_key', 'cloudinary_api_secret']
      }
    }
  });

  const config: Record<string, string> = {};
  settings.forEach(setting => {
    const key = setting.key.replace('cloudinary_', '');
    config[key] = setting.value;
  });

  return config;
}

export async function POST(request: NextRequest) {
  try {
    // Cloudinary ayarlarını al
    const config = await getCloudinaryConfig();

    if (!config.cloud_name || !config.api_key || !config.api_secret) {
      return NextResponse.json(
        { error: 'Cloudinary ayarları yapılmamış. Lütfen admin panelinden ayarları yapın.' },
        { status: 400 }
      );
    }

    // Cloudinary'yi yapılandır
    cloudinary.config({
      cloud_name: config.cloud_name,
      api_key: config.api_key,
      api_secret: config.api_secret,
    });

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || 'supersohbet';

    if (!file) {
      return NextResponse.json(
        { error: 'Dosya bulunamadı' },
        { status: 400 }
      );
    }

    // Dosyayı buffer'a çevir
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Base64'e çevir
    const base64File = `data:${file.type};base64,${buffer.toString('base64')}`;

    // Cloudinary'e yükle
    const result = await cloudinary.uploader.upload(base64File, {
      folder: folder,
      resource_type: 'auto',
    });

    return NextResponse.json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error: any) {
    console.error('Upload hatası:', error);
    return NextResponse.json(
      { error: error?.message || 'Resim yüklenirken hata oluştu' },
      { status: 500 }
    );
  }
}

// Cloudinary'den resim silme
export async function DELETE(request: NextRequest) {
  try {
    // Cloudinary ayarlarını al
    const config = await getCloudinaryConfig();

    if (!config.cloud_name || !config.api_key || !config.api_secret) {
      return NextResponse.json(
        { error: 'Cloudinary ayarları yapılmamış' },
        { status: 400 }
      );
    }

    // Cloudinary'yi yapılandır
    cloudinary.config({
      cloud_name: config.cloud_name,
      api_key: config.api_key,
      api_secret: config.api_secret,
    });

    const { publicId } = await request.json();

    if (!publicId) {
      return NextResponse.json(
        { error: 'Public ID bulunamadı' },
        { status: 400 }
      );
    }

    await cloudinary.uploader.destroy(publicId);

    return NextResponse.json({
      success: true,
      message: 'Resim silindi',
    });
  } catch (error: any) {
    console.error('Silme hatası:', error);
    return NextResponse.json(
      { error: error?.message || 'Resim silinirken hata oluştu' },
      { status: 500 }
    );
  }
}
