import { useState } from "react";
import {
  generateStarMap,
  type StarMapParams,
  type StarMapTheme,
} from "@/lib/generateStarMap";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function StarMapGenerator() {
  const [params, setParams] = useState<StarMapParams>({
    city: "New York",
    lat: 40.7128,
    lon: -74.006,
    day: 30,
    month: 5,
    year: 2026,
    hour: 15,
    minute: 30,
    theme: "black",
    constellations: true,
    constNames: true,
    starNames: false,
    meridians: false,
    mainTitle: "WRITTEN IN THE STARS",
    line1: "A special moment",
    line2: "New York",
    dontShowTime: false,
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setImageUrl(null);

    try {
      const blob = await generateStarMap(params);
      const url = URL.createObjectURL(blob);
      setImageUrl(url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate star map"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (imageUrl) {
      const a = document.createElement("a");
      a.href = imageUrl;
      a.download = `star-map-${params.city}-${params.year}-${params.month}-${params.day}.png`;
      a.click();
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-6">Star Map Generator</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={params.city}
              onChange={e => setParams({ ...params, city: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="lat">Latitude</Label>
            <Input
              id="lat"
              type="number"
              step="0.0001"
              value={params.lat}
              onChange={e =>
                setParams({ ...params, lat: parseFloat(e.target.value) })
              }
            />
          </div>

          <div>
            <Label htmlFor="lon">Longitude</Label>
            <Input
              id="lon"
              type="number"
              step="0.0001"
              value={params.lon}
              onChange={e =>
                setParams({ ...params, lon: parseFloat(e.target.value) })
              }
            />
          </div>

          <div>
            <Label htmlFor="theme">Theme</Label>
            <Select
              value={params.theme}
              onValueChange={(value: StarMapTheme) =>
                setParams({ ...params, theme: value })
              }
            >
              <SelectTrigger id="theme">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="black">Black</SelectItem>
                <SelectItem value="white">White</SelectItem>
                <SelectItem value="blue">Blue</SelectItem>
                <SelectItem value="pink">Pink</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="day">Day</Label>
            <Input
              id="day"
              type="number"
              min="1"
              max="31"
              value={params.day}
              onChange={e =>
                setParams({ ...params, day: parseInt(e.target.value) })
              }
            />
          </div>

          <div>
            <Label htmlFor="month">Month</Label>
            <Input
              id="month"
              type="number"
              min="1"
              max="12"
              value={params.month}
              onChange={e =>
                setParams({ ...params, month: parseInt(e.target.value) })
              }
            />
          </div>

          <div>
            <Label htmlFor="year">Year</Label>
            <Input
              id="year"
              type="number"
              value={params.year}
              onChange={e =>
                setParams({ ...params, year: parseInt(e.target.value) })
              }
            />
          </div>

          <div>
            <Label htmlFor="hour">Hour</Label>
            <Input
              id="hour"
              type="number"
              min="0"
              max="23"
              value={params.hour}
              onChange={e =>
                setParams({ ...params, hour: parseInt(e.target.value) })
              }
            />
          </div>

          <div>
            <Label htmlFor="minute">Minute</Label>
            <Input
              id="minute"
              type="number"
              min="0"
              max="59"
              value={params.minute}
              onChange={e =>
                setParams({ ...params, minute: parseInt(e.target.value) })
              }
            />
          </div>

          <div>
            <Label htmlFor="mainTitle">Main Title</Label>
            <Input
              id="mainTitle"
              value={params.mainTitle}
              onChange={e =>
                setParams({ ...params, mainTitle: e.target.value })
              }
            />
          </div>

          <div>
            <Label htmlFor="line1">Line 1</Label>
            <Input
              id="line1"
              value={params.line1}
              onChange={e => setParams({ ...params, line1: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="line2">Line 2</Label>
            <Input
              id="line2"
              value={params.line2}
              onChange={e => setParams({ ...params, line2: e.target.value })}
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="constellations"
              checked={params.constellations}
              onChange={e =>
                setParams({ ...params, constellations: e.target.checked })
              }
            />
            <Label htmlFor="constellations">Show Constellations</Label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="constNames"
              checked={params.constNames}
              onChange={e =>
                setParams({ ...params, constNames: e.target.checked })
              }
            />
            <Label htmlFor="constNames">Show Constellation Names</Label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="starNames"
              checked={params.starNames}
              onChange={e =>
                setParams({ ...params, starNames: e.target.checked })
              }
            />
            <Label htmlFor="starNames">Show Star Names</Label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="meridians"
              checked={params.meridians}
              onChange={e =>
                setParams({ ...params, meridians: e.target.checked })
              }
            />
            <Label htmlFor="meridians">Show Meridians</Label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="dontShowTime"
              checked={params.dontShowTime}
              onChange={e =>
                setParams({ ...params, dontShowTime: e.target.checked })
              }
            />
            <Label htmlFor="dontShowTime">Hide Time</Label>
          </div>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full mt-6"
        >
          {isGenerating ? "Generating..." : "Generate Star Map"}
        </Button>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
            {error}
          </div>
        )}

        {imageUrl && (
          <div className="mt-6 space-y-4">
            <img
              src={imageUrl}
              alt="Generated Star Map"
              className="w-full rounded-lg border"
            />
            <Button onClick={handleDownload} className="w-full">
              Download Image
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
