/**
 * 📸 Image Optimization Utilities
 * Modern, performanslı görsel yönetimi için yardımcı fonksiyonlar
 */

import type { ImageProps } from 'next/image'

/**
 * Cloudinary görsellerini optimize et
 * - WebP/AVIF format dönüşümü
 * - Boyut optimizasyonu
 * - Quality ayarlaması
 * - Lazy load placeholder
 */
export function optimizeCloudinaryImage(
  url: string,
  width?: number,
  height?: number,
  quality: 'auto:eco' | 'auto:good' | 'auto:best' = 'auto:good'
): string {
  if (!url || !url.includes('cloudinary.com')) {
    return url
  }

  const uploadIndex = url.indexOf('/upload/')
  if (uploadIndex === -1) return url

  const beforeUpload = url.substring(0, uploadIndex + 8)
  const afterUpload = url.substring(uploadIndex + 8)

  const transformations: string[] = []

  // Boyut transformasyonları
  if (width || height) {
    const dimensions = [
      width ? `w_${width}` : '',
      height ? `h_${height}` : ''
    ].filter(Boolean).join(',')

    if (dimensions) transformations.push(dimensions)
  }

  // Format ve kalite optimizasyonları
  transformations.push('f_auto')        // Auto format (WebP/AVIF on supported browsers)
  transformations.push(`q_${quality}`)  // Auto quality optimization
  transformations.push('c_limit')       // Don't upscale images
  transformations.push('dpr_auto')      // Auto device pixel ratio

  const transformString = transformations.join(',')
  return `${beforeUpload}${transformString}/${afterUpload}`
}

/**
 * Responsive image için sizes attribute oluştur
 */
export function getResponsiveSizes(type: 'avatar' | 'logo' | 'banner' | 'thumbnail' | 'full'): string {
  const sizeMap = {
    avatar: '(max-width: 640px) 40px, (max-width: 1024px) 48px, 64px',
    logo: '(max-width: 640px) 80px, (max-width: 1024px) 96px, 120px',
    thumbnail: '(max-width: 640px) 160px, (max-width: 1024px) 240px, 320px',
    banner: '(max-width: 640px) 100vw, (max-width: 1024px) 768px, 1200px',
    full: '100vw'
  }

  return sizeMap[type] || '100vw'
}

/**
 * Next.js Image component için optimized props
 */
export interface OptimizedImageProps {
  src: string
  alt: string
  type?: 'avatar' | 'logo' | 'banner' | 'thumbnail' | 'full'
  priority?: boolean
  width?: number
  height?: number
  className?: string
}

/**
 * Optimize edilmiş image props oluştur
 */
export function getOptimizedImageProps({
  src,
  alt,
  type = 'thumbnail',
  priority = false,
  width,
  height,
  className
}: OptimizedImageProps): Partial<ImageProps> {
  const isCloudinary = src?.includes('cloudinary.com')

  return {
    src: isCloudinary && width && height ? optimizeCloudinaryImage(src, width, height) : src,
    alt,
    width,
    height,
    className,
    loading: priority ? undefined : 'lazy',
    priority,
    sizes: getResponsiveSizes(type),
    quality: 85,
    // Placeholder için blur data URL (opsiyonel)
    placeholder: 'blur' as const,
    blurDataURL: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
  }
}

/**
 * Avatar için optimize props
 */
export function getAvatarProps(src: string | undefined, alt: string, size: number = 40): Partial<ImageProps> {
  if (!src) {
    return {
      alt,
      width: size,
      height: size
    }
  }

  return getOptimizedImageProps({
    src,
    alt,
    type: 'avatar',
    width: size,
    height: size
  })
}

/**
 * Logo için optimize props
 */
export function getLogoProps(src: string, alt: string, width: number = 120, height?: number): Partial<ImageProps> {
  return getOptimizedImageProps({
    src,
    alt,
    type: 'logo',
    width,
    height: height || width
  })
}

/**
 * Banner için optimize props
 */
export function getBannerProps(src: string, alt: string, priority: boolean = false): Partial<ImageProps> {
  return getOptimizedImageProps({
    src,
    alt,
    type: 'banner',
    priority,
    width: 1200,
    height: 400
  })
}
