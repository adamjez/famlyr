var builder = DistributedApplication.CreateBuilder(args);

var postgres = builder.AddPostgres("postgres")
    .WithDataVolume()
    .WithPgAdmin();

var database = postgres.AddDatabase("famlyrdb");

var api = builder.AddProject<Projects.Famlyr_Api>("api")
    .WithReference(database)
    .WaitFor(database);

#pragma warning disable ASPIRECERTIFICATES001
builder.AddViteApp("web", "../Famlyr.Web")
    .WithHttpsEndpoint(port: 3001, env: "PORT")
    .WithHttpsDeveloperCertificate()
#pragma warning restore ASPIRECERTIFICATES001
    .WithOtlpExporter()
    .WithReference(api, "PUBLIC_API_URL")
    .WaitFor(api);

builder.Build().Run();
