namespace Famlyr.Infrastructure.Models.Import;

public union ParsedImportRelationship(SpouseImportRelationship, ParentImportRelationship);

public record SpouseImportRelationship(string Person1TempId, string Person2TempId);

public record ParentImportRelationship(string ParentTempId, string ChildTempId);
