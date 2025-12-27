using Famlyr.Infrastructure.Data;
using Famlyr.MigrationService;

var builder = Host.CreateApplicationBuilder(args);

builder.AddServiceDefaults();

builder.AddNpgsqlDbContext<FamlyrDbContext>("famlyrdb");

builder.Services.AddHostedService<Worker>();

var host = builder.Build();
host.Run();
