using SkiaSharp;

namespace Famlyr.Api.Services;

public class PhotoValidationResult
{
    public bool IsValid { get; init; }
    public string? ErrorCode { get; init; }
    public string? ErrorMessage { get; init; }
    public byte[]? ImageData { get; init; }
    public string? MimeType { get; init; }
}

public class PhotoValidationService
{
    private const int MaxFileSizeBytes = 5 * 1024 * 1024; // 5MB
    private const int MinDimension = 100;
    private const int MaxDimension = 4096;

    private static readonly string[] AllowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];

    public async Task<PhotoValidationResult> Validate(IFormFile file)
    {
        if (file.Length > MaxFileSizeBytes)
        {
            return new PhotoValidationResult
            {
                IsValid = false,
                ErrorCode = "PHOTO_TOO_LARGE",
                ErrorMessage = "Photo file exceeds 5MB"
            };
        }

        using var memoryStream = new MemoryStream();
        await file.CopyToAsync(memoryStream);
        var imageData = memoryStream.ToArray();

        var mimeType = DetectMimeType(imageData);
        if (!AllowedMimeTypes.Contains(mimeType))
        {
            return new PhotoValidationResult
            {
                IsValid = false,
                ErrorCode = "INVALID_PHOTO_FORMAT",
                ErrorMessage = "Photo file is not JPEG, PNG, or WebP"
            };
        }

        var (width, height, dimensionError) = GetImageDimensions(imageData);
        if (dimensionError != null)
        {
            return new PhotoValidationResult
            {
                IsValid = false,
                ErrorCode = "INVALID_PHOTO_FORMAT",
                ErrorMessage = dimensionError
            };
        }

        if (width < MinDimension || height < MinDimension ||
            width > MaxDimension || height > MaxDimension)
        {
            return new PhotoValidationResult
            {
                IsValid = false,
                ErrorCode = "PHOTO_DIMENSIONS_INVALID",
                ErrorMessage = $"Photo dimensions out of range ({MinDimension}x{MinDimension} to {MaxDimension}x{MaxDimension})"
            };
        }

        return new PhotoValidationResult
        {
            IsValid = true,
            ImageData = imageData,
            MimeType = mimeType
        };
    }

    private static string DetectMimeType(byte[] data)
    {
        if (data.Length < 12)
            return "unknown";

        // JPEG: FF D8 FF
        if (data[0] == 0xFF && data[1] == 0xD8 && data[2] == 0xFF)
            return "image/jpeg";

        // PNG: 89 50 4E 47 0D 0A 1A 0A
        if (data[0] == 0x89 && data[1] == 0x50 && data[2] == 0x4E && data[3] == 0x47 &&
            data[4] == 0x0D && data[5] == 0x0A && data[6] == 0x1A && data[7] == 0x0A)
            return "image/png";

        // WebP: RIFF....WEBP
        if (data[0] == 0x52 && data[1] == 0x49 && data[2] == 0x46 && data[3] == 0x46 &&
            data[8] == 0x57 && data[9] == 0x45 && data[10] == 0x42 && data[11] == 0x50)
            return "image/webp";

        return "unknown";
    }

    private static (int Width, int Height, string? Error) GetImageDimensions(byte[] data)
    {
        try
        {
            using var bitmap = SKBitmap.Decode(data);
            if (bitmap == null)
                return (0, 0, "Could not decode image");

            return (bitmap.Width, bitmap.Height, null);
        }
        catch (Exception)
        {
            return (0, 0, "Could not decode image");
        }
    }
}
