/** Hardcoded Azure Blob account + containers for slim paginated URLs. */

export const STORAGE_ACCOUNT = "imagerepostorage";
export const COMPRESSED_CONTAINER = "compressedimages";
export const THUMBNAIL_CONTAINER = "thumbnailimages";

const BLOB_HOST = `https://${STORAGE_ACCOUNT}.blob.core.windows.net`;

/**
 * Append a SAS token to a blob URL. Accepts tokens with or without a leading `?`.
 */
export function appendSasToken(baseUrl: string, sasToken: string): string {
  const token = sasToken.trim();
  if (!token) return baseUrl;
  const qs = token.startsWith("?") ? token : `?${token}`;
  return `${baseUrl}${qs}`;
}

/** Encode a blob basename for the path (keeps `/` segments if present). */
export function encodeBlobName(blobName: string): string {
  return blobName
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function buildBlobUrl(
  container: string,
  blobName: string,
  sasToken: string,
): string {
  const path = `${BLOB_HOST}/${container}/${encodeBlobName(blobName)}`;
  return appendSasToken(path, sasToken);
}

/** Full compressedimages URL: account/container/blobName + SAS. */
export function buildCompressedUrl(
  blobName: string,
  sasToken: string,
): string {
  return buildBlobUrl(COMPRESSED_CONTAINER, blobName, sasToken);
}

/** Full thumbnailimages URL: account/container/blobName + SAS. */
export function buildThumbnailUrl(
  blobName: string,
  sasToken: string,
): string {
  return buildBlobUrl(THUMBNAIL_CONTAINER, blobName, sasToken);
}
