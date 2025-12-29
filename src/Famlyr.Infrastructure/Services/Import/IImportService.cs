using Famlyr.Infrastructure.Models.Import;

namespace Famlyr.Infrastructure.Services.Import;

public interface IImportService
{
    Task<ImportResponse> ImportIntoExistingTreeAsync(
        Guid treeId,
        ImportRequest request,
        bool dryRun,
        CancellationToken cancellationToken = default);

    Task<ImportResponse> ImportWithNewTreeAsync(
        ImportRequest request,
        bool dryRun,
        CancellationToken cancellationToken = default);
}
