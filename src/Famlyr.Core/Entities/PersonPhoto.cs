namespace Famlyr.Core.Entities;

public class PersonPhoto
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public required Guid PersonId { get; set; }
    public Person? Person { get; set; }
    public required byte[] ImageData { get; set; }
    public bool IsPrimary { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public int Order { get; set; }
}
