using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.IO;
using System.Reflection;

namespace Jellyfin.Plugin.SmartShuffle.Controllers;

[ApiController]
[Route("SmartShuffle")]
public sealed class SmartShuffleScriptController : ControllerBase
{
    [HttpGet("public.js")]
    [Produces("application/javascript")]
    [AllowAnonymous]
    public ActionResult GetPublicScript([FromQuery] string? _ = null)
    {
        return Content(
            "/* Smart Shuffle public script */",
            "application/javascript");
    }

    [HttpGet("private.js")]
    [Produces("application/javascript")]
    [Authorize]
    public ActionResult GetPrivateScript([FromQuery] string? _ = null)
    {
        var result = GetEmbeddedResource(
            "Jellyfin.Plugin.SmartShuffle.Web.client.js",
            "application/javascript");

        if (result is ContentResult contentResult)
        {
            var wrappedScript =
                "/* Smart Shuffle private script */\n" +
                "(function() { try {\n" +
                (contentResult.Content ?? string.Empty) +
                "\n} catch (e) { console.error(\"Error in Smart Shuffle JavaScript:\", e); } })();\n";

            return Content(wrappedScript, "application/javascript");
        }

        return result;
    }

    [HttpGet("dashboard.js")]
    [Produces("application/javascript")]
    [AllowAnonymous]
    public ActionResult GetDashboardScript([FromQuery] string? _ = null)
    {
        return GetEmbeddedResource(
            "Jellyfin.Plugin.SmartShuffle.Configuration.smartshuffle-dashboard.js",
            "application/javascript");
    }

    [HttpGet("dashboard.css")]
    [Produces("text/css")]
    [AllowAnonymous]
    public ContentResult GetDashboardCss([FromQuery] string? _ = null)
    {
        return GetEmbeddedResource(
            "Jellyfin.Plugin.SmartShuffle.Configuration.smartshuffle-dashboard.css",
            "text/css");
    }

    private ContentResult GetEmbeddedResource(string resourceName, string contentType)
    {
        var assembly = Assembly.GetExecutingAssembly();

        using var stream = assembly.GetManifestResourceStream(resourceName);

        if (stream is null)
        {
            return Content(
                $"/* Smart Shuffle: embedded resource not found: {resourceName} */",
                contentType);
        }

        using var reader = new StreamReader(stream);

        return Content(reader.ReadToEnd(), contentType);
    }
}