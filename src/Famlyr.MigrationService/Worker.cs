using Famlyr.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Famlyr.MigrationService;

public class Worker(
    IServiceProvider serviceProvider,
    IHostApplicationLifetime hostApplicationLifetime,
    ILogger<Worker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("Starting database migration...");

        using var scope = serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<FamlyrDbContext>();

        await dbContext.Database.MigrateAsync(stoppingToken);

        logger.LogInformation("Database migration completed successfully");

        hostApplicationLifetime.StopApplication();
    }
}
