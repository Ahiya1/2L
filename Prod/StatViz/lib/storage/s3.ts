/**
 * S3 Storage Implementation (STUB)
 *
 * This is a placeholder for future S3 implementation.
 * When ready to migrate to production:
 *
 * 1. Install AWS SDK: npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
 * 2. Configure environment variables: S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
 * 3. Implement methods below using S3Client
 * 4. Update STORAGE_TYPE env var to 's3'
 *
 * Implementation guide:
 * - upload(): Use PutObjectCommand with { Bucket, Key: `projects/${projectId}/${filename}`, Body: buffer }
 * - download(): Use GetObjectCommand and stream to Buffer
 * - delete(): Use DeleteObjectCommand
 * - deleteProject(): Use ListObjectsV2Command + DeleteObjectsCommand for all files in prefix
 * - getUrl(): Use getSignedUrl with GetObjectCommand (1 hour expiry recommended)
 */

import { FileStorage } from './interface'

export class S3FileStorage implements FileStorage {
  async upload(_projectId: string, _filename: string, _buffer: Buffer): Promise<string> {
    // TODO: Implement with @aws-sdk/client-s3
    // const key = `projects/${projectId}/${filename}`
    // await s3Client.send(new PutObjectCommand({ Bucket, Key: key, Body: buffer }))
    // return key
    throw new Error('S3 storage not implemented yet. Please set STORAGE_TYPE=local in environment.')
  }

  async download(_projectId: string, _filename: string): Promise<Buffer> {
    // TODO: Implement with GetObjectCommand
    // const response = await s3Client.send(new GetObjectCommand({ Bucket, Key: `projects/${projectId}/${filename}` }))
    // return Buffer.from(await response.Body.transformToByteArray())
    throw new Error('S3 storage not implemented yet. Please set STORAGE_TYPE=local in environment.')
  }

  async delete(_projectId: string, _filename: string): Promise<void> {
    // TODO: Implement with DeleteObjectCommand
    // await s3Client.send(new DeleteObjectCommand({ Bucket, Key: `projects/${projectId}/${filename}` }))
    throw new Error('S3 storage not implemented yet. Please set STORAGE_TYPE=local in environment.')
  }

  async deleteProject(_projectId: string): Promise<void> {
    // TODO: Implement with ListObjectsV2Command + DeleteObjectsCommand
    // const prefix = `projects/${projectId}/`
    // const objects = await s3Client.send(new ListObjectsV2Command({ Bucket, Prefix: prefix }))
    // if (objects.Contents && objects.Contents.length > 0) {
    //   await s3Client.send(new DeleteObjectsCommand({
    //     Bucket,
    //     Delete: { Objects: objects.Contents.map(obj => ({ Key: obj.Key })) }
    //   }))
    // }
    throw new Error('S3 storage not implemented yet. Please set STORAGE_TYPE=local in environment.')
  }

  getUrl(_projectId: string, _filename: string): string {
    // TODO: Generate signed URL with getSignedUrl
    // const command = new GetObjectCommand({ Bucket, Key: `projects/${projectId}/${filename}` })
    // return await getSignedUrl(s3Client, command, { expiresIn: 3600 })
    throw new Error('S3 storage not implemented yet. Please set STORAGE_TYPE=local in environment.')
  }
}
