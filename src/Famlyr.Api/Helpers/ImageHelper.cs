namespace Famlyr.Api.Helpers;

public static class ImageHelper
{
    public static string DetectMimeType(byte[] data)
    {
        if (data.Length < 12) return "application/octet-stream";

        if (data[0] == 0xFF && data[1] == 0xD8 && data[2] == 0xFF)
            return "image/jpeg";

        if (data[0] == 0x89 && data[1] == 0x50 && data[2] == 0x4E && data[3] == 0x47)
            return "image/png";

        if (data[0] == 0x52 && data[1] == 0x49 && data[2] == 0x46 && data[3] == 0x46 &&
            data.Length > 11 && data[8] == 0x57 && data[9] == 0x45 && data[10] == 0x42 && data[11] == 0x50)
            return "image/webp";

        return "application/octet-stream";
    }

    public static string BuildPhotoUrl(string baseUrl, Guid treeId, Guid personId, Guid photoId)
    {
        // Extension hint for PixiJS Assets.load() - actual format is determined by Content-Type header
        return $"{baseUrl}/api/trees/{treeId}/persons/{personId}/photos/{photoId}/image.png";
    }
}
