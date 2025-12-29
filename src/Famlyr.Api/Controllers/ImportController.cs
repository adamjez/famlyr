using Famlyr.Infrastructure.Models.Import;
using Famlyr.Infrastructure.Services.Import;
using Microsoft.AspNetCore.Mvc;

namespace Famlyr.Api.Controllers;

[ApiController]
[Route("api")]
public class ImportController(IImportService importService) : ControllerBase
{
    [HttpPost("trees/{treeId:guid}/import")]
    [RequestSizeLimit(50 * 1024 * 1024)]
    public async Task<ActionResult<ImportResponse>> ImportIntoExistingTree(
        Guid treeId,
        [FromBody] ImportRequest request,
        [FromQuery] bool dryRun = false,
        CancellationToken cancellationToken = default)
    {
        var response = await importService.ImportIntoExistingTreeAsync(
            treeId, request, dryRun, cancellationToken);

        if (!response.Success)
        {
            if (response.Errors?.Exists(e => e.Type == "TREE_NOT_FOUND") == true)
                return NotFound(response);

            return BadRequest(response);
        }

        return Ok(response);
    }

    [HttpPost("trees/import")]
    [RequestSizeLimit(50 * 1024 * 1024)]
    public async Task<ActionResult<ImportResponse>> ImportWithNewTree(
        [FromBody] ImportRequest request,
        [FromQuery] bool dryRun = false,
        CancellationToken cancellationToken = default)
    {
        var response = await importService.ImportWithNewTreeAsync(
            request, dryRun, cancellationToken);

        if (!response.Success)
            return BadRequest(response);

        return Created($"/api/trees/{response.TreeId}", response);
    }
}
