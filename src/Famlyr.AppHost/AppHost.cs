var builder = DistributedApplication.CreateBuilder(args);

var postgres = builder.AddPostgres("postgres")
    .WithDataVolume()
    .WithPgAdmin(b => b.WithExplicitStart());

var database = postgres.AddDatabase("famlyrdb");

var migrations = builder.AddDotnetProject("migrations", "../Famlyr.MigrationService/Famlyr.MigrationService.csproj")
    .WithReference(database)
    .WaitFor(database);

var api = builder.AddDotnetProject("api", "../Famlyr.Api/Famlyr.Api.csproj")
    .WithReference(database)
    .WaitForCompletion(migrations);

#pragma warning disable ASPIRECERTIFICATES001
builder.AddViteApp("web", "../Famlyr.Web")
    .WithHttpsEndpoint(port: 3001, env: "PORT")
    .WithHttpsDeveloperCertificate()
#pragma warning restore ASPIRECERTIFICATES001
    .WithOtlpExporter()
    .WithReference(api, "PUBLIC_API_URL")
    .WaitFor(api);

builder.Build().Run();
