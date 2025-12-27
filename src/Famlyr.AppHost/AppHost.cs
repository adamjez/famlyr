var builder = DistributedApplication.CreateBuilder(args);

var postgres = builder.AddPostgres("postgres")
    .WithDataVolume()
    .WithPgAdmin();

var database = postgres.AddDatabase("famlyrdb");

builder.AddProject<Projects.Famlyr_Api>("api")
    .WithReference(database)
    .WaitFor(database);

builder.Build().Run();
