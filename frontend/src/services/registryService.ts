import api from "./api";

export interface RegistryRow {
  name: string;
  description?: string;
}

export const fetchResources = async (): Promise<RegistryRow[]> => {
  const res = await api.get("api/v1/registry/resources");
  return (
    res.data?.data?.resources?.map((r: any) => ({
      name: r.resource_name,
      description: r.description,
    })) ?? []
  );
};

export const fetchActions = async (): Promise<RegistryRow[]> => {
  const res = await api.get("api/v1/registry/actions");
  return (
    res.data?.data?.actions?.map((a: any) => ({
      name: a.action_name,
      description: a.description,
    })) ?? []
  );
};

export const createResource = async (payload: {
  resource_name: string;
  description?: string;
}) => {
  const res = await api.post("api/v1/registry/resources", payload);
  return res.data;
};

export const updateResource = async (
  resourceName: string,
  payload: { description?: string }
) => {
  const res = await api.put(
    `/api/v1/registry/resources/${resourceName}`,
    payload
  );
  return res.data;
};

export const createAction = async (payload: {
  action_name: string;
  description?: string;
}) => {
  const res = await api.post("api/v1/registry/actions", payload);
  return res.data;
};

export const updateAction = async (
  actionName: string,
  payload: { description?: string }
) => {
  const res = await api.put(
    `/api/v1/registry/actions/${actionName}`,
    payload
  );
  return res.data;
};


export type RegistryCatalog = Record<
  string,
  {
    actions: string[];
  }
>;

export const fetchRegistryCatalog = async (): Promise<RegistryCatalog> => {
  const res = await api.get(
    "api/v1/registry/catalog"
  );

  return res.data?.data?.catalog ?? {};
};
