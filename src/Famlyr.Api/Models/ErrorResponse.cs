namespace Famlyr.Api.Models;

public class ErrorResponse
{
    public required string Code { get; init; }
    public required string Message { get; init; }
}
