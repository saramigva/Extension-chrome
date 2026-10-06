import { describe, expect, it } from "vitest";
import { areaIdFromNominatim, buildOverpassQuery, parseOverpass } from "../src/core/osm";

describe("OpenStreetMap", () => {
  it("convierte el resultado de Nominatim en un área de Overpass", () => {
    expect(areaIdFromNominatim([{ osm_type: "relation", osm_id: 5400890, display_name: "Lisboa, Portugal" }])).toEqual({ areaId: 3605400890, label: "Lisboa, Portugal" });
    expect(areaIdFromNominatim([{ osm_type: "node", osm_id: 1 }])).toBeNull();
    expect(areaIdFromNominatim("error")).toBeNull();
  });

  it("construye la consulta con los sectores elegidos", () => {
    const q = buildOverpassQuery(3605400890, ["dental", "restaurante"]);
    expect(q).toContain("area(3605400890)->.a;");
    expect(q).toContain('nwr["amenity"~"^dentist$"]["website"](area.a);');
    expect(q).toContain('nwr["amenity"~"^(restaurant|cafe|bar|pub|fast_food|ice_cream)$"]["contact:website"](area.a);');
    expect(q).toMatch(/out tags center 400;$/);
  });

  it("si no hay área, busca el municipio por nombre", () => {
    expect(buildOverpassQuery('Lis"boa', ["dental"])).toContain('area["name"="Lisboa"]["boundary"="administrative"]["admin_level"~"^(7|8)$"]->.a;');
  });

  it("extrae negocios con web propia, contactos y dirección", () => {
    const json = {
      elements: [
        { type: "node", id: 1, tags: { name: "Clínica Dental Sol", amenity: "dentist", website: "http://www.clinicasol.pt/inicio", phone: "+351 213 456 789", email: "geral@clinicasol.pt", "addr:street": "Rua Augusta", "addr:housenumber": "10", "addr:postcode": "1100-053", "addr:city": "Lisboa" } },
        { type: "way", id: 2, tags: { name: "Tasca do Zé", amenity: "restaurant", "contact:website": "tascadoze.pt", "contact:phone": "912345678" } },
        { type: "node", id: 3, tags: { name: "Só Facebook", amenity: "cafe", website: "https://facebook.com/socafe" } },
        { type: "node", id: 4, tags: { name: "Sin web", amenity: "bar" } },
        { type: "node", id: 5, tags: { name: "Clínica Sol (filial)", amenity: "dentist", website: "https://clinicasol.pt" } },
        { type: "node", id: 6, tags: { name: "Otra cosa", shop: "supermarket", website: "https://super.pt" } },
      ],
    };
    const c = parseOverpass(json, ["dental", "restaurante"], "Lisboa");
    expect(c.map((x) => x.domain)).toEqual(["clinicasol.pt", "tascadoze.pt"]);
    expect(c[0]).toMatchObject({
      key: "node/1", name: "Clínica Dental Sol", website: "https://www.clinicasol.pt/", sector: "dental", zone: "Lisboa",
      phones: ["+351213456789"], emails: ["geral@clinicasol.pt"], address: "Rua Augusta 10, 1100-053 Lisboa",
    });
    expect(c[1]).toMatchObject({ sector: "restaurante", website: "https://tascadoze.pt/", phones: ["+351912345678"] });
  });
});
